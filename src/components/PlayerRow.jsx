import { useState, useRef } from 'react'
import { getFlag } from '../lib/flags.js'
import { calculatePoints } from '../lib/scoring.js'

function buildBreakdown(matchStats, position) {
  const lines = []
  let totalMins = 0, totalGoals = 0, totalAssists = 0, totalRC = 0, totalOG = 0
  let hasCS = false

  for (const ms of matchStats) {
    if (ms.unmatched) continue
    totalMins += ms.minutes || 0
    totalGoals += ms.goals || 0
    totalAssists += ms.assists || 0
    totalRC += ms.red_cards || 0
    totalOG += ms.own_goals || 0
    if (ms.clean_sheet) hasCS = true
  }

  if (totalMins >= 60) lines.push(`+2 played 60+ mins`)
  else if (totalMins > 0) lines.push(`+1 played ${totalMins} mins`)

  if (totalGoals > 0) {
    const gPts = position === 'GK' || position === 'DEF' ? 6 : 5
    lines.push(`+${totalGoals * gPts} goal${totalGoals > 1 ? 's' : ''} (${totalGoals}×${gPts})`)
  }
  if (totalAssists > 0) lines.push(`+${totalAssists * 3} assist${totalAssists > 1 ? 's' : ''} (${totalAssists}×3)`)
  if (hasCS) {
    const csPts = position === 'GK' ? 6 : 4
    lines.push(`+${csPts} clean sheet`)
  }
  if (totalRC > 0) lines.push(`${totalRC * -2} red card`)
  if (totalOG > 0) lines.push(`${totalOG * -2} own goal`)

  return lines
}

const POS_COLORS = {
  GK:  'bg-yellow-500/20 text-yellow-400',
  DEF: 'bg-blue-500/20 text-blue-400',
  MID: 'bg-green-500/20 text-green-400',
  FWD: 'bg-red-500/20 text-red-400',
}

function fmtScore(ms) {
  if (ms.home_score == null) return '—'
  return `${ms.home_score}–${ms.away_score}`
}

function PointsTooltip({ points, matchStats, position }) {
  const [visible, setVisible] = useState(false)
  const [above, setAbove] = useState(true)
  const anchorRef = useRef(null)
  const breakdown = buildBreakdown(matchStats, position)

  const handleEnter = () => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      // Tooltip ~120px tall; show above unless insufficient space
      setAbove(rect.top > 140)
    }
    setVisible(true)
  }

  return (
    <span ref={anchorRef} className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={() => setVisible(false)}>
      <span className="cursor-help border-b border-dashed border-gold-500/40">{points}</span>
      {visible && breakdown.length > 0 && (
        <div className={`absolute z-50 right-0 bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 shadow-xl w-44 text-left ${
          above ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {breakdown.map((line, i) => (
            <div key={i} className={`text-xs font-normal whitespace-nowrap ${line.startsWith('-') ? 'text-red-400' : 'text-gray-200'}`}>
              {line}
            </div>
          ))}
          <div className="border-t border-dark-500 mt-1.5 pt-1.5 text-xs font-bold text-gold-400">
            = {points} pts
          </div>
        </div>
      )}
    </span>
  )
}

export default function PlayerRow({ player, matchStats = [], transferred, transferredIn }) {
  const [expanded, setExpanded] = useState(false)

  const totalPts = matchStats.reduce((s, ms) => s + (ms.points || 0), 0)
  const hasMatches = matchStats.length > 0
  const isUnmatched = matchStats.some(ms => ms.unmatched)

  const totals = matchStats.reduce((acc, ms) => ({
    minutes: (acc.minutes || 0) + (ms.minutes || 0),
    goals:   (acc.goals || 0)   + (ms.goals || 0),
    assists: (acc.assists || 0) + (ms.assists || 0),
    clean_sheet: acc.clean_sheet || ms.clean_sheet,
    red_cards:  (acc.red_cards || 0)  + (ms.red_cards || 0),
    own_goals:  (acc.own_goals || 0)  + (ms.own_goals || 0),
  }), {})

  const canExpand = matchStats.length > 1

  return (
    <>
      <tr
        onClick={() => canExpand && setExpanded(e => !e)}
        className={`border-b border-dark-700 transition-colors
          ${transferred ? 'opacity-40' : 'hover:bg-dark-700/40'}
          ${canExpand ? 'cursor-pointer' : ''}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{player.player}</span>
            {isUnmatched && (
              <span className="badge bg-orange-500/20 text-orange-400">⚠ Unmatched</span>
            )}
            {transferred && (
              <span className="badge bg-gray-500/20 text-gray-400">Transferred Out</span>
            )}
            {transferredIn && (
              <span className="badge bg-green-500/20 text-green-400">In from {transferredIn}</span>
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <span className={`badge ${POS_COLORS[player.position] || 'bg-gray-500/20 text-gray-400'}`}>
            {player.position}
          </span>
        </td>
        <td className="px-3 py-3 hidden md:table-cell">
          <span className="text-sm" title={player.nation}>
            {getFlag(player.nation)} {player.nation}
          </span>
        </td>
        <td className="px-3 py-3 text-center text-sm">{hasMatches ? (totals.minutes || 0) : '—'}</td>
        <td className="px-3 py-3 text-center text-sm">{hasMatches ? (totals.goals || 0) : '—'}</td>
        <td className="px-3 py-3 text-center text-sm">{hasMatches ? (totals.assists || 0) : '—'}</td>
        <td className="px-3 py-3 text-center text-sm">
          {hasMatches ? (totals.clean_sheet ? <span className="text-green-400">✓</span> : <span className="text-gray-600">✗</span>) : '—'}
        </td>
        <td className="px-3 py-3 text-center text-sm">{hasMatches ? (totals.red_cards || 0) : '—'}</td>
        <td className="px-3 py-3 text-center text-sm">{hasMatches ? (totals.own_goals || 0) : '—'}</td>
        <td className="px-3 py-3 text-center font-bold text-gold-500">
          {hasMatches ? (
            <PointsTooltip points={totalPts} matchStats={matchStats} position={player.position} />
          ) : '—'}
          {canExpand && (
            <span className="ml-1 text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
          )}
        </td>
      </tr>

      {expanded && matchStats.map((ms, i) => {
        const opponent = ms.home_team === player.nation
          ? ms.away_team
          : ms.home_team
        return (
          <tr key={i} className="border-b border-dark-700/40 bg-dark-900/60 text-xs">
            <td className="px-4 py-2 pl-8 text-gray-400" colSpan={2}>
              {ms.date} vs {opponent}
            </td>
            <td className="px-3 py-2 text-center text-gray-400 hidden md:table-cell">
              {fmtScore(ms)} {ms.went_to_et && <span className="text-xs text-gray-500">(AET)</span>}
            </td>
            <td className="px-3 py-2 text-center text-gray-300">{ms.minutes}</td>
            <td className="px-3 py-2 text-center text-gray-300">{ms.goals}</td>
            <td className="px-3 py-2 text-center text-gray-300">{ms.assists}</td>
            <td className="px-3 py-2 text-center text-gray-300">
              {ms.clean_sheet ? <span className="text-green-400">✓</span> : <span className="text-gray-600">✗</span>}
            </td>
            <td className="px-3 py-2 text-center text-gray-300">{ms.red_cards}</td>
            <td className="px-3 py-2 text-center text-gray-300">{ms.own_goals}</td>
            <td className="px-3 py-2 text-center font-semibold text-gold-400">{ms.points}</td>
          </tr>
        )
      })}
    </>
  )
}
