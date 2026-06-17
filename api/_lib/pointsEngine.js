// Shared points calculation engine used by leaderboard and manager routes
import { getKV } from './kv.js'
import { getFixturePlayers, getFixtureEvents } from './footballApi.js'
import { matchPlayerName } from './nameMatch.js'
import { calculatePoints, mapPosition } from './scoring.js'
import { wentToExtraTime, fullMatchThreshold } from './gameweeks.js'

async function fetchAndCacheStats(kv, fixtureId) {
  const statsKey = `stats:fixture:${fixtureId}`
  let cached = await kv.get(statsKey)
  if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached

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

  const result = { fixture_id: fixtureId, players, raw_events: eventsResponse || [] }
  await kv.set(statsKey, JSON.stringify(result))
  return result
}

// Enrich a raw stats player with clean_sheet based on goal events
// Clean sheet awarded if player played 60+ mins and no goals were conceded
// by their team WHILE they were on the pitch (FPL-style event-based logic)
function enrichPlayer(p, fixtureStatus, fixture, rawEvents) {
  const et = wentToExtraTime(fixtureStatus)
  const minutesPlayed = p.minutes || 0

  // Count goals conceded by this player's team while they were on the pitch
  const goalsAgainstWhileOn = (rawEvents || []).filter(ev => {
    if (ev.type !== 'Goal') return false
    const goalMin = (ev.time?.elapsed || 0) + (ev.time?.extra || 0)
    if (goalMin > minutesPlayed) return false // goal scored after player left
    // Own goal: ev.team is the team of the player who scored it (they conceded)
    // Normal goal: ev.team is the team who scored (the opponent)
    return ev.detail === 'Own Goal'
      ? ev.team?.name === p.team
      : ev.team?.name !== p.team
  }).length

  const cleanSheet = minutesPlayed >= 60 && goalsAgainstWhileOn === 0
  return { ...p, went_to_et: et, clean_sheet: cleanSheet }
}

// Compute points for one squad player across a set of fixtures
// Returns { points, matchStats[] } where matchStats has per-match breakdown
export async function computePlayerPoints(kv, squadPlayer, fixtures, overrides) {
  const matchStats = []
  let unmatched = false

  for (const fixture of fixtures) {
    const fixtureId = fixture.fixture_id || fixture.fixture?.id
    const status = fixture.status || fixture.fixture?.status?.short || 'FT'

    let statsData
    try {
      statsData = await fetchAndCacheStats(kv, fixtureId)
    } catch (e) {
      console.error(`Stats fetch failed for fixture ${fixtureId}:`, e.message)
      continue
    }

    const matched = matchPlayerName(squadPlayer.player, statsData.players, overrides, squadPlayer.nation, squadPlayer.position)

    if (!matched) {
      unmatched = true
      matchStats.push({
        fixture_id: fixtureId,
        date: fixture.date,
        home_team: fixture.home_team,
        away_team: fixture.away_team,
        home_score: fixture.home_score,
        away_score: fixture.away_score,
        minutes: 0, goals: 0, assists: 0,
        red_cards: 0, own_goals: 0, clean_sheet: false,
        saves: 0, points: 0, unmatched: true,
      })
      continue
    }

    const raw = statsData.players.find(p => p.name === matched)
    const enriched = enrichPlayer(raw, status, fixture, statsData.raw_events)

    // Determine position for scoring: sheet position is primary
    const position = squadPlayer.position || mapPosition(enriched.api_position) || 'MID'
    const points = calculatePoints(position, enriched)

    matchStats.push({
      fixture_id: fixtureId,
      date: fixture.date,
      home_team: fixture.home_team,
      away_team: fixture.away_team,
      home_score: fixture.home_score,
      away_score: fixture.away_score,
      minutes: enriched.minutes,
      goals: enriched.goals,
      assists: enriched.assists,
      red_cards: enriched.red_cards,
      own_goals: enriched.own_goals,
      clean_sheet: enriched.clean_sheet,
      saves: enriched.saves,
      went_to_et: enriched.went_to_et,
      points,
      unmatched: false,
    })
  }

  const totalPoints = matchStats.reduce((s, m) => s + (m.points || 0), 0)
  return { matchStats, totalPoints, unmatched }
}
