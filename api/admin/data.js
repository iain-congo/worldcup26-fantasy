import { getKV } from '../_lib/kv.js'
import { normalize } from '../_lib/nameMatch.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const kv = getKV()

  // POST: utility actions
  if (req.method === 'POST') {
    const { action, name, nation } = req.body || {}

    // Clear stale unmatched list
    if (action === 'clear_unmatched') {
      await kv.del('unmatched:players')
      return res.json({ ok: true })
    }

    // Look up correct player ID from cached fixture stats by name
    if (action === 'lookup_id' && name) {
      const keys = await kv.keys('stats:fixture:*')
      const found = new Map()
      for (const key of keys) {
        let data = await kv.get(key)
        if (!data) continue
        if (typeof data === 'string') data = JSON.parse(data)
        for (const p of data.players || []) {
          const normApi = normalize(p.name)
          const normSearch = normalize(name)
          if (normApi.includes(normSearch) || normSearch.includes(normApi)) {
            if (!nation || normalize(p.team).includes(normalize(nation))) {
              const k = `${p.player_id}`
              if (!found.has(k)) found.set(k, { name: p.name, nation: p.team, position: p.api_position, player_id: p.player_id })
            }
          }
        }
      }
      return res.json({ matches: [...found.values()] })
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {

    // All snapshots
    const snapshots = {}
    for (let gw = 1; gw <= 9; gw++) {
      const raw = await kv.get(`snapshot:gw${gw}`)
      if (raw) snapshots[gw] = typeof raw === 'string' ? JSON.parse(raw) : raw
    }

    // Unmatched players
    const unmatchedRaw = await kv.get('unmatched:players')
    const unmatched = unmatchedRaw
      ? (typeof unmatchedRaw === 'string' ? JSON.parse(unmatchedRaw) : unmatchedRaw)
      : []

    // Overrides
    const overridesRaw = await kv.get('overrides')
    const overrides = overridesRaw
      ? (typeof overridesRaw === 'string' ? JSON.parse(overridesRaw) : overridesRaw)
      : {}

    // API call log for last 7 days
    const apiLog = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = d.toISOString().slice(0, 10)
      const count = await kv.get(`api:calls:${date}`)
      apiLog[date] = Number(count || 0)
    }

    res.json({ snapshots, unmatched, overrides, apiLog })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
