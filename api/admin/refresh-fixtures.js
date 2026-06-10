import { getKV } from '../_lib/kv.js'
import { getFixtures } from '../_lib/footballApi.js'
import { buildNationSchedule } from '../_lib/gameweeks.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const kv = getKV()
    const fixtures = await getFixtures(kv)
    const schedule = buildNationSchedule(fixtures)
    await kv.set('fixtures:all', JSON.stringify(fixtures))
    await kv.set('nation:schedule', JSON.stringify(schedule))
    res.json({ ok: true, fixtures: fixtures.length, nations: Object.keys(schedule).length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
