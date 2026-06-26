import { getKV } from '../_lib/kv.js'

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
  const col = n => header.findIndex(h => h.toLowerCase() === n.toLowerCase())
  const mI = col('Manager'), pI = col('Player'), nI = col('Nation'), posI = col('Position'), idI = col('Player ID')
  return data.filter(r => r[mI] && r[pI]).map(r => ({
    manager: r[mI]?.trim(),
    player: r[pI]?.trim(),
    nation: r[nI]?.trim(),
    position: r[posI]?.trim()?.toUpperCase(),
    player_id: r[idI] ? Number(r[idI]) : null,
  }))
}

export default async function handler(req, res) {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const kv = getKV()
  const sheetPlayers = await fetchSheet()

  // Build lookup: manager+player name → player_id
  const idLookup = new Map()
  for (const p of sheetPlayers) {
    const key = `${p.manager}|${p.player}`.toLowerCase()
    if (p.player_id) idLookup.set(key, p.player_id)
  }

  const results = []

  for (const gw of [1, 2, 3]) {
    const kvKey = `snapshot:gw${gw}`
    let snapshot = await kv.get(kvKey)
    if (!snapshot) { results.push(`GW${gw}: no snapshot found`); continue }
    if (typeof snapshot === 'string') snapshot = JSON.parse(snapshot)

    let updated = 0
    const enriched = snapshot.map(p => {
      if (p.player_id) return p // already has ID
      const key = `${p.manager}|${p.player}`.toLowerCase()
      const id = idLookup.get(key)
      if (id) { updated++; return { ...p, player_id: id } }
      return p
    })

    await kv.set(kvKey, JSON.stringify(enriched))
    const missing = enriched.filter(p => !p.player_id).length
    results.push(`GW${gw}: ${updated} IDs added, ${missing} still missing`)
  }

  res.json({ ok: true, results })
}
