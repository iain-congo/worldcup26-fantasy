const BASE = 'https://v3.football.api-sports.io'
const LEAGUE = 1
const SEASON = 2026

async function apiFetch(path, kv) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
  })
  if (!res.ok) throw new Error(`API-Football ${path} → ${res.status}`)

  // Log API call count
  if (kv) {
    const today = new Date().toISOString().slice(0, 10)
    const key = `api:calls:${today}`
    const current = (await kv.get(key)) || 0
    await kv.set(key, Number(current) + 1)
  }

  const json = await res.json()
  return json.response
}

export async function getFixtures(kv) {
  return apiFetch(`/fixtures?league=${LEAGUE}&season=${SEASON}`, kv)
}

export async function getFinishedFixtures(kv) {
  return apiFetch(`/fixtures?league=${LEAGUE}&season=${SEASON}&status=FT-AET-PEN`, kv)
}

export async function getFixturePlayers(fixtureId, kv) {
  return apiFetch(`/fixtures/players?fixture=${fixtureId}`, kv)
}

export async function getFixtureEvents(fixtureId, kv) {
  return apiFetch(`/fixtures/events?fixture=${fixtureId}`, kv)
}

export async function getRounds(kv) {
  return apiFetch(`/fixtures/rounds?league=${LEAGUE}&season=${SEASON}`, kv)
}
