import { getKV } from '../_lib/kv.js'
import { normalize } from '../_lib/nameMatch.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { name, nation } = req.query
  if (!name) return res.status(400).json({ error: 'name required' })

  const kv = getKV()
  const keys = await kv.keys('stats:fixture:*')
  const matches = []

  for (const key of keys) {
    let data = await kv.get(key)
    if (!data) continue
    if (typeof data === 'string') data = JSON.parse(data)

    for (const p of data.players || []) {
      const normApi = normalize(p.name)
      const normSearch = normalize(name)
      if (normApi.includes(normSearch) || normSearch.includes(normApi)) {
        if (!nation || normalize(p.team).includes(normalize(nation))) {
          const existing = matches.find(m => m.player_id === p.player_id)
          if (!existing) matches.push({ name: p.name, nation: p.team, position: p.api_position, player_id: p.player_id })
        }
      }
    }
  }

  // Also clear stale unmatched list if requested
  if (req.query.clear_unmatched === '1') {
    await kv.del('unmatched:players')
    return res.json({ matches, cleared: true })
  }

  res.json({ matches })
}
