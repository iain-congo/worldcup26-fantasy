import { getKV } from './_lib/kv.js'
import { getFixtures } from './_lib/footballApi.js'
import { buildNationSchedule, assignGameweek } from './_lib/gameweeks.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  try {
    const kv = getKV()

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
    const startedGWs = new Set()

    const fixtures = rawFixtures.map(f => {
      const date = (f.fixture?.date || '').slice(0, 10)
      const status = f.fixture?.status?.short || ''
      const finished = ['FT', 'AET', 'PEN'].includes(status)
      const gw = assignGameweek(f, nationSchedule)

      if (date <= today && gw) startedGWs.add(gw)

      return {
        fixture_id: f.fixture?.id,
        date,
        home_team: f.teams?.home?.name,
        away_team: f.teams?.away?.name,
        home_score: f.goals?.home,
        away_score: f.goals?.away,
        status,
        finished,
        round: f.league?.round,
        gameweek: gw,
      }
    })

    // Current GW = highest GW with a match on or before today
    let currentGW = 1
    if (startedGWs.size > 0) currentGW = Math.max(...startedGWs)

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    res.json({
      fixtures,
      nationSchedule,
      started: [...startedGWs].sort((a, b) => a - b),
      currentGW,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
