import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { SkeletonRow } from '../components/Skeleton.jsx'
import { fetchLeaderboard } from '../lib/api.js'
import { getFlag } from '../lib/flags.js'
import { GAMEWEEKS } from '../lib/scoring.js'

function RankArrow({ movement }) {
  if (movement > 0) return <span className="text-green-400 text-xs font-bold">↑{movement}</span>
  if (movement < 0) return <span className="text-red-400 text-xs font-bold">↓{Math.abs(movement)}</span>
  return <span className="text-gray-600 text-xs">—</span>
}

function SquadTooltip({ squad, visible }) {
  if (!visible || !squad?.length) return null
  return (
    <div className="absolute z-50 left-0 top-full mt-1 bg-dark-700 border border-dark-500 rounded-lg p-3 w-56 shadow-xl">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Current Squad</p>
      <ul className="space-y-1">
        {squad.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span>{getFlag(p.nation)}</span>
            <span className="text-gray-200">{p.player}</span>
            <span className={`ml-auto font-mono text-xs ${
              p.position === 'GK' ? 'text-yellow-400' :
              p.position === 'DEF' ? 'text-blue-400' :
              p.position === 'MID' ? 'text-green-400' : 'text-red-400'
            }`}>{p.position}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ManagerRow({ mgr, idx }) {
  const [hovered, setHovered] = useState(false)
  const timerRef = useRef(null)

  const handleEnter = () => {
    clearTimeout(timerRef.current)
    setHovered(true)
  }
  const handleLeave = () => {
    timerRef.current = setTimeout(() => setHovered(false), 200)
  }

  return (
    <tr className={`border-b border-dark-700 transition-colors hover:bg-dark-700/40 ${idx === 0 ? 'bg-gold-500/5' : ''}`}>
      <td className="px-4 py-4">
        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
          <span className="text-gray-400 font-mono text-sm">{idx + 1}</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
          <Link
            to={`/manager/${encodeURIComponent(mgr.name)}`}
            className={`font-semibold hover:underline ${idx === 0 ? 'text-gold-500' : 'text-white'}`}
          >
            {mgr.name}
          </Link>
          <SquadTooltip squad={mgr.squad} visible={hovered} />
        </div>
      </td>
      <td className="px-4 py-4 text-center text-gray-300 hidden sm:table-cell">
        {mgr.gwPoints ?? '—'}
      </td>
      <td className={`px-4 py-4 text-center text-xl font-bold ${idx === 0 ? 'text-gold-500' : 'text-white'}`}>
        {mgr.totalPoints}
      </td>
      <td className="px-4 py-4 text-center hidden sm:table-cell">
        <RankArrow movement={mgr.rankMovement ?? 0} />
      </td>
    </tr>
  )
}

export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    try {
      const json = await fetchLeaderboard()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load])

  const currentGWInfo = data?.currentGW
    ? GAMEWEEKS.find(g => g.gw === data.currentGW)
    : null

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          {currentGWInfo && (
            <span className="inline-flex items-center gap-1.5 mt-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold px-2.5 py-1 rounded-full">
              🏆 GW{currentGWInfo.gw} — {currentGWInfo.description}
            </span>
          )}
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">Updated {lastUpdated.toLocaleTimeString()}</p>
        )}
      </div>

      {error && (
        <div className="card border-red-800/60 bg-red-900/20 text-red-300 text-sm">
          Failed to load leaderboard: {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-600 text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Manager</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">GW Pts</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">Move</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              : data?.managers?.map((mgr, idx) => (
                <ManagerRow key={mgr.name} mgr={mgr} idx={idx} />
              ))
            }
          </tbody>
        </table>
      </div>

      {!loading && data?.managers?.length === 0 && (
        <div className="card text-center text-gray-400 py-8">
          No match data yet — check back after the first fixtures are played.
        </div>
      )}

      {lastUpdated && (
        <p className="text-xs text-gray-600 text-right">
          Auto-refreshes every 5 minutes · Hover a manager name to preview their squad
        </p>
      )}
    </div>
  )
}
