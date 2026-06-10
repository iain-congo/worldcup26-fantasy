import { useState } from 'react'
import { getFlag } from '../lib/flags.js'
import { calculatePoints } from '../lib/scoring.js'

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
          {hasMatches ? totalPts : '—'}
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
