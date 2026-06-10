import { getKV } from '../_lib/kv.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { sheetName, statsName } = req.body
    if (!sheetName || !statsName) {
      return res.status(400).json({ error: 'sheetName and statsName required' })
    }

    const kv = getKV()
    const raw = await kv.get('overrides')
    const overrides = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
    overrides[sheetName.toLowerCase().trim()] = statsName.toLowerCase().trim()
    await kv.set('overrides', JSON.stringify(overrides))

    // Remove from unmatched list
    const unmatchedRaw = await kv.get('unmatched:players')
    if (unmatchedRaw) {
      const unmatched = typeof unmatchedRaw === 'string' ? JSON.parse(unmatchedRaw) : unmatchedRaw
      const filtered = unmatched.filter(
        u => u.player?.toLowerCase()?.trim() !== sheetName.toLowerCase().trim()
      )
      await kv.set('unmatched:players', JSON.stringify(filtered))
    }

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
