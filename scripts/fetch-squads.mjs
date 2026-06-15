import { writeFileSync } from 'fs'

const API_KEY = '7ab0d62af6457dcb8c160b3e7331e09e'
const BASE = 'https://v3.football.api-sports.io'

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
  })
  const json = await res.json()
  return json.response
}

console.log('Fetching WC2026 teams...')
const teams = await apiFetch('/teams?league=1&season=2026')
console.log(`Found ${teams.length} teams`)

const rows = []
let callCount = 1

for (const t of teams) {
  const teamId = t.team.id
  const teamName = t.team.name
  process.stdout.write(`  Fetching squad: ${teamName}...`)

  const squads = await apiFetch(`/players/squads?team=${teamId}`)
  callCount++

  const players = squads?.[0]?.players || []
  for (const p of players) {
    rows.push({
      name: p.name,
      country: teamName,
      position: p.position,
    })
  }
  console.log(` ${players.length} players`)

  // Small delay to be polite to the API
  await new Promise(r => setTimeout(r, 200))
}

console.log(`\nTotal API calls made: ${callCount}`)
console.log(`Total players: ${rows.length}`)

const csv = [
  'Player Name,Country,Position',
  ...rows.map(r => `"${r.name}","${r.country}","${r.position}"`),
].join('\n')

writeFileSync('scripts/wc2026-squads.csv', csv)
console.log('\n✅ Saved to scripts/wc2026-squads.csv')
