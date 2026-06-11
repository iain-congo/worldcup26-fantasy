import { getKV } from '../_lib/kv.js'
import { getFixtures, getFixturePlayers, getFixtureEvents } from '../_lib/footballApi.js'
import { buildNationSchedule, assignGameweek, KNOCKOUT_GW_INFO } from '../_lib/gameweeks.js'

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
  const auth = req.headers.authorization
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results = []
  const kv = getKV()

  try {
    // 1. Fetch latest fixture list from API-Football
    const latestFixtures = await getFixtures(kv)
    const nationSchedule = buildNationSchedule(latestFixtures)

    // Update caches
    await kv.set('fixtures:all', JSON.stringify(latestFixtures))
    await kv.set('nation:schedule', JSON.stringify(nationSchedule))
    results.push(`Refreshed fixture list: ${latestFixtures.length} fixtures`)

    // 2. Find newly finished fixtures not yet cached
    const finishedStatuses = ['FT', 'AET', 'PEN']
    const finishedFixtures = latestFixtures.filter(f =>
      finishedStatuses.includes(f.fixture?.status?.short)
    )

    let newlyCached = 0
    for (const f of finishedFixtures) {
      const fixtureId = f.fixture?.id
      if (!fixtureId) continue

      const statsKey = `stats:fixture:${fixtureId}`
      const existing = await kv.get(statsKey)
      if (existing) continue

      // Fetch and cache stats + events
      try {
        const [playersResponse, eventsResponse] = await Promise.all([
          getFixturePlayers(fixtureId, kv),
          getFixtureEvents(fixtureId, kv),
        ])

        const ownGoalsByPlayer = {}
        for (const ev of eventsResponse || []) {
          if (ev.type === 'Goal' && ev.detail === 'Own Goal') {
            const name = ev.player?.name || ''
            if (name) ownGoalsByPlayer[name] = (ownGoalsByPlayer[name] || 0) + 1
          }
        }

        const players = []
        for (const teamBlock of playersResponse || []) {
          const teamName = teamBlock.team?.name
          for (const p of teamBlock.players || []) {
            const s = p.statistics?.[0] || {}
            const games = s.games || {}
            const goals = s.goals || {}
            const cards = s.cards || {}
            const name = p.player?.name || ''
            players.push({
              player_id: p.player?.id,
              name,
              team: teamName,
              api_position: games.position || p.player?.pos || '',
              minutes: games.minutes || 0,
              goals: goals.total || 0,
              assists: goals.assists || 0,
              yellow_cards: cards.yellow || 0,
              red_cards: cards.red || 0,
              saves: goals.saves || 0,
              goals_conceded: goals.conceded || 0,
              own_goals: ownGoalsByPlayer[name] || 0,
            })
          }
        }

        await kv.set(statsKey, JSON.stringify({ fixture_id: fixtureId, players, raw_events: eventsResponse || [] }))
        newlyCached++
      } catch (e) {
        results.push(`⚠ Failed to cache fixture ${fixtureId}: ${e.message}`)
      }
    }

    results.push(`Cached stats for ${newlyCached} new fixtures`)

    // 3. Auto-snapshot knockout GWs that started yesterday (if no snapshot exists)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yDate = yesterday.toISOString().slice(0, 10)

    for (const kgw of KNOCKOUT_GW_INFO) {
      if (kgw.start <= yDate && kgw.end >= yDate) {
        const key = `snapshot:gw${kgw.gw}`
        const existing = await kv.get(key)
        if (!existing) {
          const players = await fetchSheet()
          await kv.set(key, JSON.stringify(players))
          results.push(`Auto-snapshotted GW${kgw.gw} (${kgw.label})`)
        }
      }
    }

    res.json({ ok: true, results })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message, results })
  }
}
