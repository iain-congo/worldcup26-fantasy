import { getKV } from './_lib/kv.js'
import { getCompetitionId, getAllMatches } from './_lib/statsApi.js'
import { buildNationSchedule, assignGameweek, KNOCKOUT_GW_INFO } from './_lib/gameweeks.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  try {
    const kv = getKV()

    // Load or build nation schedule
    let nationSchedule = await kv.get('nation:schedule')
    if (!nationSchedule) {
      const compId = await getCompetitionId()
      const rawMatches = await getAllMatches(compId)
      nationSchedule = buildNationSchedule(rawMatches)
      await kv.set('nation:schedule', JSON.stringify(nationSchedule))
    } else if (typeof nationSchedule === 'string') {
      nationSchedule = JSON.parse(nationSchedule)
    }

    // Get all matches (use cache if available)
    let allMatchesRaw = await kv.get('matches:all')
    if (!allMatchesRaw) {
      const compId = await getCompetitionId()
      const rawMatches = await getAllMatches(compId)
      allMatchesRaw = rawMatches
      // Cache for 1 hour
      await kv.set('matches:all', JSON.stringify(rawMatches), { ex: 3600 })
    } else if (typeof allMatchesRaw === 'string') {
      allMatchesRaw = JSON.parse(allMatchesRaw)
    }

    const today = new Date().toISOString().slice(0, 10)

    // Figure out which GWs have started
    const startedGWs = new Set()
    const matches = allMatchesRaw.map(m => {
      const date = (m.date || m.match_date || m.scheduled_date || '').slice(0, 10)
      const gw = assignGameweek(m, nationSchedule)
      const status = m.status || 'unknown'
      const finished = status.toLowerCase().includes('finish') ||
        status.toLowerCase().includes('ft') ||
        status.toLowerCase().includes('complete')

      if (date <= today && gw) startedGWs.add(gw)

      return {
        match_id: m.id || m.match_id,
        date,
        home_team: m.home_team,
        away_team: m.away_team,
        status,
        finished,
        gameweek: gw,
        round: m.round || m.stage,
      }
    })

    // Current GW = highest GW whose start date has passed
    let currentGW = 1
    const knockoutStarted = KNOCKOUT_GW_INFO.filter(k => k.start <= today)
    if (knockoutStarted.length > 0) {
      currentGW = Math.max(...knockoutStarted.map(k => k.gw))
    } else {
      // Use group stage GWs
      const groupGWs = [...startedGWs].filter(g => g <= 3)
      if (groupGWs.length > 0) currentGW = Math.max(...groupGWs)
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    res.json({
      matches,
      nationSchedule,
      started: [...startedGWs].sort((a, b) => a - b),
      currentGW,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
