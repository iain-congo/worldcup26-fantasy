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
  const { manager, gw } = req.query
  if (!manager) return res.status(400).json({ error: 'manager required' })
  const gwNum = parseInt(gw || '1', 10)

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

    // Get squad for this GW (snapshot or current sheet)
    const currentSheet = await fetchSheet()
    let snapshotWarning = null
    let gwSquad = null

    const snapRaw = await kv.get(`snapshot:gw${gwNum}`)
    if (snapRaw) {
      gwSquad = typeof snapRaw === 'string' ? JSON.parse(snapRaw) : snapRaw
    } else {
      // Fallback to earliest available snapshot
      for (let g = 1; g <= 9; g++) {
        const s = await kv.get(`snapshot:gw${g}`)
        if (s) {
          gwSquad = typeof s === 'string' ? JSON.parse(s) : s
          if (g !== gwNum) snapshotWarning = `No snapshot found for GW${gwNum} — using earliest available (GW${g})`
          break
        }
      }
      if (!gwSquad) gwSquad = currentSheet
    }

    const managerSquad = gwSquad.filter(p => p.manager === manager)

    // Finished fixtures for this GW
    const gwFixtures = rawFixtures
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
      .filter(f =>
        f.gameweek === gwNum &&
        ['FT', 'AET', 'PEN'].includes(f.status) &&
        f.date <= today
      )

    // Compute stats for each player
    const unmatchedPlayers = []
    const squad = []

    for (const player of managerSquad) {
      const playerFixtures = gwFixtures.filter(f =>
        f.home_team === player.nation || f.away_team === player.nation
      )

      const { matchStats, totalPoints, unmatched } = await computePlayerPoints(
        kv, player, playerFixtures, overrides
      )

      if (unmatched) unmatchedPlayers.push({ ...player, manager })
      squad.push({ ...player, matchStats, totalPoints })
    }

    // Detect transfers vs current sheet
    const currentManagerSquad = currentSheet.filter(p => p.manager === manager)
    const gwNames = new Set(managerSquad.map(p => p.player))
    const currentNames = new Set(currentManagerSquad.map(p => p.player))

    // Mark transferred-out players in squad
    for (const entry of squad) {
      if (!currentNames.has(entry.player)) entry.transferred = true
    }

    // Add currently active players not in this GW's snapshot (transferred in)
    for (const player of currentManagerSquad) {
      if (!gwNames.has(player.player)) {
        squad.push({ ...player, matchStats: [], totalPoints: 0, transferredIn: `GW${gwNum}` })
      }
    }

    // Build substitution log by comparing sequential snapshots
    const substitutions = []
    for (let g = 1; g <= 8; g++) {
      const prevRaw = await kv.get(`snapshot:gw${g}`)
      const nextRaw = await kv.get(`snapshot:gw${g + 1}`)
      if (!prevRaw || !nextRaw) continue
      const prev = (typeof prevRaw === 'string' ? JSON.parse(prevRaw) : prevRaw).filter(p => p.manager === manager)
      const next = (typeof nextRaw === 'string' ? JSON.parse(nextRaw) : nextRaw).filter(p => p.manager === manager)
      const prevSet = new Set(prev.map(p => p.player))
      const nextSet = new Set(next.map(p => p.player))
      const outs = [...prevSet].filter(n => !nextSet.has(n))
      const ins = [...nextSet].filter(n => !prevSet.has(n))
      for (let i = 0; i < Math.max(outs.length, ins.length); i++) {
        if (outs[i] || ins[i]) {
          substitutions.push({ gw: g + 1, out: outs[i] || '?', in: ins[i] || '?' })
        }
      }
    }

    // Persist unmatched players to KV
    if (unmatchedPlayers.length > 0) {
      const existRaw = (await kv.get('unmatched:players')) || '[]'
      const existing = typeof existRaw === 'string' ? JSON.parse(existRaw) : existRaw
      const existingKeys = new Set(existing.map(u => `${u.manager}:${u.player}`))
      for (const u of unmatchedPlayers) {
        const k = `${u.manager}:${u.player}`
        if (!existingKeys.has(k)) existing.push(u)
      }
      await kv.set('unmatched:players', JSON.stringify(existing))
    }

    res.json({ squad, substitutions, snapshotWarning })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
