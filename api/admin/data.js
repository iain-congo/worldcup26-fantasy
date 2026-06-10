import { getKV } from '../_lib/kv.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const kv = getKV()

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
