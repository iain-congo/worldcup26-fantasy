import { getKV } from '../_lib/kv.js'

export const config = { runtime: 'nodejs' }

const BASE = 'https://v3.football.api-sports.io'
const POS_MAP = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Attacker: 'FWD' }

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
  })
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length) {
    throw new Error(JSON.stringify(json.errors))
  }
  return json.response
}

export default async function handler(req, res) {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 1. Get all 48 WC2026 teams
    const teams = await apiFetch('/teams?league=1&season=2026')
    if (!teams?.length) {
      return res.status(502).json({ error: 'No teams returned from API — plan may not include 2026' })
    }

    // 2. Fetch squad for each team
    const players = []
    for (const t of teams) {
      const teamName = t.team.name
      const teamId = t.team.id

      let squads
      try {
        squads = await apiFetch(`/players/squads?team=${teamId}`)
      } catch (e) {
        console.error(`Failed squad fetch for ${teamName}:`, e.message)
        continue
      }

      for (const p of squads?.[0]?.players || []) {
        players.push({
          name: p.name,
          nation: teamName,
          position: POS_MAP[p.position] || p.position || '?',
        })
      }

      // Small delay to be polite to the API
      await new Promise(r => setTimeout(r, 150))
    }

    players.sort((a, b) =>
      a.nation.localeCompare(b.nation) || a.position.localeCompare(b.position) || a.name.localeCompare(b.name)
    )

    const csv = [
      'Name,Nation,Position',
      ...players.map(p => `"${p.name}","${p.nation}","${p.position}"`),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="wc2026-squads.csv"')
    res.send(csv)

  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
