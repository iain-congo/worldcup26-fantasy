import { getKV } from '../_lib/kv.js'
import { getCompetitionId, getAllMatches } from '../_lib/statsApi.js'
import { buildNationSchedule } from '../_lib/gameweeks.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const adminPw = req.headers['admin-password']
  if (adminPw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const kv = getKV()
    const compId = await getCompetitionId()
    const rawMatches = await getAllMatches(compId)
    const schedule = buildNationSchedule(rawMatches)

    await kv.set('nation:schedule', JSON.stringify(schedule))
    await kv.set('matches:all', JSON.stringify(rawMatches), { ex: 3600 })

    res.json({ ok: true, nations: Object.keys(schedule).length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
