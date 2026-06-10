const BASE = 'https://api.thestatsapi.com'

async function statsGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.STATS_API_KEY}` },
  })
  if (!res.ok) throw new Error(`StatsAPI ${path} → ${res.status}`)
  return res.json()
}

export async function getCompetitionId() {
  const data = await statsGet('/api/football/competitions?search=world%20cup')
  const wc = (data.data || data).find(c =>
    /world cup 2026|fifa world cup/i.test(c.name) && c.season == 2026
  )
  if (!wc) throw new Error('World Cup 2026 competition not found')
  return wc.id || wc.competition_id
}

export async function getAllMatches(competitionId) {
  const data = await statsGet(
    `/api/football/matches?competition_id=${competitionId}&season=2026`
  )
  return data.data || data
}

export async function getPlayerStats(matchId) {
  const data = await statsGet(`/api/football/players/stats?match_id=${matchId}`)
  return data.data || data
}

export async function getMatchEvents(matchId) {
  const data = await statsGet(`/api/football/matches/${matchId}/events`)
  return data.data || data
}
