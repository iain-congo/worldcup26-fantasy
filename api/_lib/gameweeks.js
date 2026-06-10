// Knockout round date ranges and GW assignments
const KNOCKOUT_GWS = [
  { gw: 4, start: '2026-06-28', end: '2026-07-03', label: 'Round of 32', round: 'Round of 32' },
  { gw: 5, start: '2026-07-04', end: '2026-07-07', label: 'Round of 16', round: 'Round of 16' },
  { gw: 6, start: '2026-07-09', end: '2026-07-11', label: 'Quarter-finals', round: 'Quarter-finals' },
  { gw: 7, start: '2026-07-14', end: '2026-07-15', label: 'Semi-finals', round: 'Semi-finals' },
  { gw: 8, start: '2026-07-18', end: '2026-07-18', label: 'Bronze Final', round: '3rd Place Final' },
  { gw: 9, start: '2026-07-19', end: '2026-07-19', label: 'Final', round: 'Final' },
]

export const KNOCKOUT_GW_INFO = KNOCKOUT_GWS

export const ALL_GWS = [
  { gw: 1, label: 'GW1', description: 'Group Stage - Match 1' },
  { gw: 2, label: 'GW2', description: 'Group Stage - Match 2' },
  { gw: 3, label: 'GW3', description: 'Group Stage - Match 3' },
  ...KNOCKOUT_GWS.map(k => ({ gw: k.gw, label: `GW${k.gw}`, description: k.label })),
]

function dateStr(d) {
  if (!d) return ''
  return String(d).slice(0, 10)
}

// API-Football round string → GW number (for knockout)
const ROUND_TO_GW = {
  'round of 32': 4,
  'round of 16': 5,
  'quarter-finals': 6,
  'semi-finals': 7,
  '3rd place final': 8,
  'final': 9,
}

function roundToKnockoutGW(round) {
  const r = (round || '').toLowerCase().trim()
  return ROUND_TO_GW[r] || null
}

// Build nation schedule from API-Football fixture list
// Fixture shape: { fixture: { id, date }, teams: { home: { name }, away: { name } }, league: { round } }
export function buildNationSchedule(fixtures) {
  const groupFixtures = fixtures.filter(f => {
    const round = (f.league?.round || '').toLowerCase()
    return round.startsWith('group stage')
  })

  const byNation = {}
  for (const f of groupFixtures) {
    const date = dateStr(f.fixture?.date)
    if (!date) continue
    const teams = [f.teams?.home?.name, f.teams?.away?.name].filter(Boolean)
    for (const team of teams) {
      if (!byNation[team]) byNation[team] = []
      if (!byNation[team].includes(date)) byNation[team].push(date)
    }
  }

  const schedule = {}
  for (const [nation, dates] of Object.entries(byNation)) {
    const sorted = [...dates].sort()
    schedule[nation] = {
      gw1: sorted[0] || null,
      gw2: sorted[1] || null,
      gw3: sorted[2] || null,
    }
  }
  return schedule
}

// Assign a GW number to a fixture
export function assignGameweek(fixture, nationSchedule) {
  const round = fixture.league?.round || fixture.round || ''
  const date = dateStr(fixture.fixture?.date || fixture.date)

  // Knockout: check round name first
  const kgw = roundToKnockoutGW(round)
  if (kgw) return kgw

  // Also check by date range as fallback
  for (const k of KNOCKOUT_GWS) {
    if (date >= k.start && date <= k.end) return k.gw
  }

  // Group stage: use home team's nation schedule
  const homeTeam = fixture.teams?.home?.name || fixture.home_team
  if (homeTeam && nationSchedule?.[homeTeam]) {
    const sched = nationSchedule[homeTeam]
    if (sched.gw1 === date) return 1
    if (sched.gw2 === date) return 2
    if (sched.gw3 === date) return 3
  }

  // Try away team
  const awayTeam = fixture.teams?.away?.name || fixture.away_team
  if (awayTeam && nationSchedule?.[awayTeam]) {
    const sched = nationSchedule[awayTeam]
    if (sched.gw1 === date) return 1
    if (sched.gw2 === date) return 2
    if (sched.gw3 === date) return 3
  }

  return null
}

// Determine the current active GW based on today's date
export function currentGW(today = new Date()) {
  const d = today.toISOString().slice(0, 10)
  // Check knockout GWs in reverse order
  for (const k of [...KNOCKOUT_GWS].reverse()) {
    if (d >= k.start) return k.gw
  }
  // Still in group stage — return 1 as default
  return 1
}

// Check if a fixture's status means it went to extra time
export function wentToExtraTime(status) {
  const s = (status || '').toUpperCase()
  return s === 'AET' || s === 'PEN'
}

// Full match threshold in minutes
export function fullMatchThreshold(wentToET) {
  return wentToET ? 120 : 90
}
