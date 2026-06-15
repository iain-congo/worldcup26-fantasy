import { getKV } from '../_lib/kv.js'

export const config = { runtime: 'nodejs' }

const POS_MAP = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' }

export default async function handler(req, res) {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const kv = getKV()

  // Find all cached fixture stat keys
  const keys = await kv.keys('stats:fixture:*')
  if (!keys.length) return res.status(404).json({ error: 'No cached fixture stats found. Matches may not have been played yet.' })

  const seen = new Map() // player_id or name+team → player record

  for (const key of keys) {
    let data = await kv.get(key)
    if (!data) continue
    if (typeof data === 'string') data = JSON.parse(data)

    for (const p of data.players || []) {
      const dedupeKey = p.player_id ? `id:${p.player_id}` : `${p.name}|${p.team}`
      if (seen.has(dedupeKey)) continue
      seen.set(dedupeKey, {
        name: p.name,
        nation: p.team,
        position: POS_MAP[(p.api_position || '').toUpperCase()] || p.api_position || '?',
      })
    }
  }

  const players = [...seen.values()].sort((a, b) =>
    a.nation.localeCompare(b.nation) || a.position.localeCompare(b.position) || a.name.localeCompare(b.name)
  )

  const csv = [
    'Name,Nation,Position',
    ...players.map(p => `"${p.name}","${p.nation}","${p.position}"`),
  ].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="wc2026-players.csv"')
  res.send(csv)
}
