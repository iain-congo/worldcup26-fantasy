import { getKV } from '../_lib/kv.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const kv = getKV()
    let deleted = 0
    let cursor = 0

    do {
      const [nextCursor, keys] = await kv.scan(cursor, { match: 'stats:fixture:*', count: 100 })
      cursor = parseInt(nextCursor, 10)
      for (const key of keys) { await kv.del(key); deleted++ }
    } while (cursor !== 0)

    // Also clear events cache
    cursor = 0
    do {
      const [nextCursor, keys] = await kv.scan(cursor, { match: 'events:fixture:*', count: 100 })
      cursor = parseInt(nextCursor, 10)
      for (const key of keys) { await kv.del(key); deleted++ }
    } while (cursor !== 0)

    res.json({ ok: true, deleted })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
