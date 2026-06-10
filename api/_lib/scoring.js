// API-Football position letter → our position code
export function mapPosition(apiPos) {
  const map = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' }
  return map[(apiPos || '').toUpperCase()] || null
}

// Calculate fantasy points for a player in one fixture
// position: 'GK' | 'DEF' | 'MID' | 'FWD'  (use sheet position, fall back to API mapped position)
// stats: { minutes, goals, assists, red_cards, own_goals, clean_sheet }
export function calculatePoints(position, stats) {
  if (!stats) return 0
  let pts = 0

  const mins = stats.minutes || 0
  if (mins >= 60) pts += 2
  else if (mins > 0) pts += 1

  const goals = stats.goals || 0
  if (position === 'GK' || position === 'DEF') pts += goals * 6
  else pts += goals * 5

  pts += (stats.assists || 0) * 3

  if (stats.clean_sheet) {
    if (position === 'GK') pts += 6
    else if (position === 'DEF') pts += 4
  }

  pts += (stats.red_cards || 0) * -2
  pts += (stats.own_goals || 0) * -2

  return pts
}
