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

export const GAMEWEEKS = [
  { gw: 1, label: 'GW1', description: 'Group Stage - Match 1' },
  { gw: 2, label: 'GW2', description: 'Group Stage - Match 2' },
  { gw: 3, label: 'GW3', description: 'Group Stage - Match 3' },
  { gw: 4, label: 'GW4', description: 'Round of 32' },
  { gw: 5, label: 'GW5', description: 'Round of 16' },
  { gw: 6, label: 'GW6', description: 'Quarter-finals' },
  { gw: 7, label: 'GW7', description: 'Semi-finals' },
  { gw: 8, label: 'GW8', description: 'Bronze Final' },
  { gw: 9, label: 'GW9', description: 'Final' },
]
