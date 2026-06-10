import { getKV } from './_lib/kv.js'

export const config = { runtime: 'nodejs' }

const SHEET_ID = '182mXrhBfUD0Oes654uIpBJaDaUvnJbwuVxnJ0IVaqtw'
const TAB = 'Players'

async function fetchSheet() {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(TAB)}` +
    `?key=${process.env.GOOGLE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Sheets API ${res.status}`)
  const json = await res.json()
  const rows = json.values || []
  const [header, ...data] = rows
  if (!header) return []
  const col = name => header.findIndex(h => h.toLowerCase() === name.toLowerCase())
  const mI = col('Manager'), pI = col('Player'), nI = col('Nation'), posI = col('Position')
  return data
    .filter(r => r[mI] && r[pI])
    .map(r => ({
      manager: r[mI]?.trim(),
      player: r[pI]?.trim(),
      nation: r[nI]?.trim(),
      position: r[posI]?.trim()?.toUpperCase(),
    }))
}

export default async function handler(req, res) {
  const { gw } = req.query
  if (!gw) return res.status(400).json({ error: 'gw required' })

  const kv = getKV()
  const key = `snapshot:gw${gw}`

  if (req.method === 'GET') {
    try {
      let snapshot = await kv.get(key)
      if (!snapshot) {
        // Fallback: find earliest available snapshot
        for (let g = 1; g <= 9; g++) {
          const s = await kv.get(`snapshot:gw${g}`)
          if (s) {
            const data = typeof s === 'string' ? JSON.parse(s) : s
            return res.json({
              snapshot: data,
              warning: `No snapshot found for GW${gw} — using earliest available (GW${g})`,
            })
          }
        }
        return res.json({ snapshot: null, warning: null })
      }
      const data = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot
      return res.json({ snapshot: data, warning: null })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'POST') {
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      const existing = await kv.get(key)
      if (existing) return res.status(409).json({ error: `Snapshot for GW${gw} already exists` })

      const players = await fetchSheet()
      await kv.set(key, JSON.stringify(players))
      return res.json({ ok: true, count: players.length })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  if (req.method === 'DELETE') {
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      await kv.del(key)
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
