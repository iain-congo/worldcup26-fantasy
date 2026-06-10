import { getKV } from './_lib/kv.js'
import { getFixtures } from './_lib/footballApi.js'
import { buildNationSchedule, assignGameweek } from './_lib/gameweeks.js'
import { computePlayerPoints } from './_lib/pointsEngine.js'

export const config = { runtime: 'nodejs' }

const SHEET_ID = '182mXrhBfUD0Oes654uIpBJaDaUvnJbwuVxnJ0IVaqtw'
const TAB = 'Players'

async function fetchSheet() {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(TAB)}` +
    `?key=${process.env.GOOGLE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets API ${res.status}`)
  const json = await res.json()
  const rows = json.values || []
  const [header, ...data] = rows
  if (!header) return []
  const col = n => header.findIndex(h => h.toLowerCase() === n.toLowerCase())
  const mI = col('Manager'), pI = col('Player'), nI = col('Nation'), posI = col('Position')
  return data.filter(r => r[mI] && r[pI]).map(r => ({
    manager: r[mI]?.trim(),
    player: r[pI]?.trim(),
    nation: r[nI]?.trim(),
    position: r[posI]?.trim()?.toUpperCase(),
  }))
}

export default async function handler(req, res) {
  try {
    const kv = getKV()

    const overridesRaw = await kv.get('overrides')
    const overrides = overridesRaw
      ? (typeof overridesRaw === 'string' ? JSON.parse(overridesRaw) : overridesRaw)
      : {}

    let rawFixtures = await kv.get('fixtures:all')
    if (typeof rawFixtures === 'string') rawFixtures = JSON.parse(rawFixtures)

    let nationSchedule = await kv.get('nation:schedule')
    if (typeof nationSchedule === 'string') nationSchedule = JSON.parse(nationSchedule)

    if (!rawFixtures) {
      rawFixtures = await getFixtures(kv)
      nationSchedule = buildNationSchedule(rawFixtures)
      await kv.set('fixtures:all', JSON.stringify(rawFixtures))
      await kv.set('nation:schedule', JSON.stringify(nationSchedule))
    }
    if (!nationSchedule) {
      nationSchedule = buildNationSchedule(rawFixtures)
      await kv.set('nation:schedule', JSON.stringify(nationSchedule))
    }

    const today = new Date().toISOString().slice(0, 10)

    // Finished fixtures with GW assigned
    const finishedFixtures = rawFixtures
      .map(f => ({
        fixture_id: f.fixture?.id,
        date: (f.fixture?.date || '').slice(0, 10),
        home_team: f.teams?.home?.name,
        away_team: f.teams?.away?.name,
        home_score: f.goals?.home,
        away_score: f.goals?.away,
        status: f.fixture?.status?.short || 'FT',
        gameweek: assignGameweek(f, nationSchedule),
        round: f.league?.round,
      }))
      .filter(f => ['FT', 'AET', 'PEN'].includes(f.status) && f.date <= today && f.gameweek)

    if (finishedFixtures.length === 0) {
      return res.json({ managers: [], currentGW: 1 })
    }

    const gwsWithMatches = [...new Set(finishedFixtures.map(f => f.gameweek))]
    const currentGW = Math.max(...gwsWithMatches)

    const currentSheet = await fetchSheet()
    const managers = [...new Set(currentSheet.map(p => p.manager))]

    // Group fixtures by GW
    const fixturesByGW = {}
    for (const f of finishedFixtures) {
      if (!fixturesByGW[f.gameweek]) fixturesByGW[f.gameweek] = []
      fixturesByGW[f.gameweek].push(f)
    }

    // For each manager, compute points per GW
    const managerTotals = {}
    const managerGWPoints = {}
    const managerSquads = {}

    for (const manager of managers) {
      managerTotals[manager] = 0
      managerGWPoints[manager] = {}
    }

    for (const gw of gwsWithMatches) {
      const gwFixtures = fixturesByGW[gw] || []

      // Get squad for this GW
      let gwSquad = currentSheet
      const snapRaw = await kv.get(`snapshot:gw${gw}`)
      if (snapRaw) {
        gwSquad = typeof snapRaw === 'string' ? JSON.parse(snapRaw) : snapRaw
      }

      for (const manager of managers) {
        const squad = gwSquad.filter(p => p.manager === manager)
        if (!managerSquads[manager]) managerSquads[manager] = squad

        let gwPts = 0
        for (const player of squad) {
          // Only include fixtures where this player's nation played
          const playerFixtures = gwFixtures.filter(f =>
            f.home_team === player.nation || f.away_team === player.nation
          )
          if (playerFixtures.length === 0) continue

          const { totalPoints } = await computePlayerPoints(kv, player, playerFixtures, overrides)
          gwPts += totalPoints
        }

        managerGWPoints[manager][gw] = gwPts
        managerTotals[manager] += gwPts
      }
    }

    // Compute previous-GW ranks for movement
    const prevTotals = {}
    for (const manager of managers) {
      prevTotals[manager] = managerTotals[manager] - (managerGWPoints[manager][currentGW] || 0)
    }
    const prevRanked = [...managers].sort((a, b) => (prevTotals[b] || 0) - (prevTotals[a] || 0))
    const prevRankMap = Object.fromEntries(prevRanked.map((m, i) => [m, i + 1]))

    const ranked = managers
      .map(manager => ({
        name: manager,
        totalPoints: managerTotals[manager] || 0,
        gwPoints: managerGWPoints[manager][currentGW] || 0,
        squad: managerSquads[manager] || [],
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((m, i) => ({
        ...m,
        rank: i + 1,
        rankMovement: (prevRankMap[m.name] || i + 1) - (i + 1),
      }))

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    res.json({ managers: ranked, currentGW })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
