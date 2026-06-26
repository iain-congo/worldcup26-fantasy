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

// Enrich a raw stats player with clean_sheet based on match score
// goals_conceded from the API is only reliable for GKs; use scoreline for everyone
function enrichPlayer(p, fixtureStatus, fixture) {
  const et = wentToExtraTime(fixtureStatus)
  const threshold = fullMatchThreshold(et)
  const playedFull = (p.minutes || 0) >= threshold

  let conceded = null
  if (fixture) {
    if (p.team === fixture.home_team) conceded = fixture.away_score
    else if (p.team === fixture.away_team) conceded = fixture.home_score
  }
  const cleanSheet = playedFull && conceded === 0
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

    // If stats returned no players, the fixture data wasn't available — skip silently
    if (!statsData.players?.length) continue

    // ID match first (most reliable), fall back to name matching
    let matchedPlayer = squadPlayer.player_id
      ? statsData.players.find(p => p.player_id === squadPlayer.player_id)
      : null
    const matched = matchedPlayer ? matchedPlayer.name
      : matchPlayerName(squadPlayer.player, statsData.players, overrides, squadPlayer.nation, squadPlayer.position)

    if (!matched) {
      // Player's nation played but player not in fixture stats — they didn't play (not selected, injured, rested)
      // Skip silently — no points, no unmatched flag
      continue
    }

    const raw = statsData.players.find(p => p.name === matched)
    const enriched = enrichPlayer(raw, status, fixture)

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
