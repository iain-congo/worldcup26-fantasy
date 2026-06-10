export const config = { runtime: 'edge' }

const SHEET_ID = '182mXrhBfUD0Oes654uIpBJaDaUvnJbwuVxnJ0IVaqtw'
const TAB = 'Players'

export default async function handler(req) {
  try {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(TAB)}` +
      `?key=${process.env.GOOGLE_API_KEY}`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Sheets API ${res.status}`)
    const json = await res.json()

    const rows = json.values || []
    const [header, ...data] = rows
    if (!header) return jsonRes([])

    const idx = (col) => header.findIndex(h => h.toLowerCase() === col.toLowerCase())
    const mI = idx('Manager'), pI = idx('Player'), nI = idx('Nation'), posI = idx('Position')

    const players = data
      .filter(r => r[mI] && r[pI])
      .map(r => ({
        manager: r[mI]?.trim(),
        player: r[pI]?.trim(),
        nation: r[nI]?.trim(),
        position: r[posI]?.trim()?.toUpperCase(),
      }))

    return jsonRes(players)
  } catch (e) {
    return jsonRes({ error: e.message }, 500)
  }
}

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
