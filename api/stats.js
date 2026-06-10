import { getKV } from './_lib/kv.js'
import { getFixturePlayers, getFixtureEvents } from './_lib/footballApi.js'
import { wentToExtraTime, fullMatchThreshold } from './_lib/gameweeks.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  const { fixture } = req.query
  if (!fixture) return res.status(400).json({ error: 'fixture id required' })

  try {
    const kv = getKV()
    const statsKey = `stats:fixture:${fixture}`
    const eventsKey = `events:fixture:${fixture}`

    let cached = await kv.get(statsKey)
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached
      return res.json(data)
    }

    const [playersResponse, eventsResponse] = await Promise.all([
      getFixturePlayers(fixture, kv),
      getFixtureEvents(fixture, kv),
    ])

    // Parse events: own goals
    const ownGoalsByPlayer = {}
    for (const ev of eventsResponse || []) {
      if (ev.type === 'Goal' && ev.detail === 'Own Goal') {
        const name = ev.player?.name || ''
        if (name) ownGoalsByPlayer[name] = (ownGoalsByPlayer[name] || 0) + 1
      }
    }

    // Detect fixture status from events (extra time presence)
    // We'll get status from the fixture data passed in context; this is a fallback
    const hasExtraTimeEvent = (eventsResponse || []).some(
      ev => ev.time?.extra !== null && ev.time?.extra > 0
    )

    // Parse player stats from /fixtures/players response
    // Response is array of { team: { name }, players: [{ player, statistics }] }
    const players = []
    for (const teamBlock of playersResponse || []) {
      const teamName = teamBlock.team?.name
      for (const p of teamBlock.players || []) {
        const s = p.statistics?.[0] || {}
        const games = s.games || {}
        const goals = s.goals || {}
        const cards = s.cards || {}

        const name = p.player?.name || ''
        const mins = games.minutes || 0
        const apiPos = games.position || p.player?.pos || ''

        players.push({
          player_id: p.player?.id,
          name,
          team: teamName,
          api_position: apiPos,
          minutes: mins,
          goals: goals.total || 0,
          assists: goals.assists || 0,
          yellow_cards: cards.yellow || 0,
          red_cards: cards.red || 0,
          saves: goals.saves || 0,
          goals_conceded: goals.conceded || 0,
          own_goals: ownGoalsByPlayer[name] || 0,
          // Clean sheet calculated at score-time using fixture status
        })
      }
    }

    const result = {
      fixture_id: Number(fixture),
      players,
      has_extra_time_events: hasExtraTimeEvent,
      raw_events: eventsResponse || [],
    }

    // Cache — caller must only call for finished fixtures
    await kv.set(statsKey, JSON.stringify(result))

    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
