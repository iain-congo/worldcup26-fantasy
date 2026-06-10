import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PlayerRow from '../components/PlayerRow.jsx'
import { SkeletonTable } from '../components/Skeleton.jsx'
import { GAMEWEEKS } from '../lib/scoring.js'
import { fetchFixtures, fetchManagerGW } from '../lib/api.js'

function validateSquad(players) {
  if (!players?.length) return null
  const counts = players.reduce((acc, p) => ({ ...acc, [p.position]: (acc[p.position] || 0) + 1 }), {})
  if (players.length !== 6) return `${players.length} players detected (need exactly 6)`
  if ((counts.GK || 0) !== 1) return `${counts.GK || 0} GK detected (need exactly 1)`
  if ((counts.DEF || 0) !== 2) return `${counts.DEF || 0} DEF detected (need exactly 2)`
  if (((counts.MID || 0) + (counts.FWD || 0)) !== 3) return `${(counts.MID || 0) + (counts.FWD || 0)} MID/FWD detected (need exactly 3)`
  return null
}

export default function ManagerDetail() {
  const { name } = useParams()
  const managerName = decodeURIComponent(name)

  const [activeGW, setActiveGW] = useState(null)
  const [gwDataCache, setGwDataCache] = useState({})
  const [loading, setLoading] = useState(false)
  const [availableGWs, setAvailableGWs] = useState([1])
  const [currentGW, setCurrentGW] = useState(1)
  const [fixturesError, setFixturesError] = useState(null)

  // Load fixture meta on mount
  useEffect(() => {
    fetchFixtures()
      .then(data => {
        const started = data.started?.length ? data.started : [1]
        const cur = data.currentGW || 1
        setAvailableGWs(started)
        setCurrentGW(cur)
        setActiveGW(cur)
      })
      .catch(e => {
        setFixturesError(e.message)
        setAvailableGWs([1])
        setActiveGW(1)
      })
  }, [])

  // Load GW data when tab changes
  useEffect(() => {
    if (!activeGW) return
    if (gwDataCache[activeGW]) return

    setLoading(true)
    fetchManagerGW(managerName, activeGW)
      .then(data => setGwDataCache(prev => ({ ...prev, [activeGW]: data })))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeGW, managerName, gwDataCache])

  const currentData = gwDataCache[activeGW]
  const squad = currentData?.squad || []

  // Squad validation only on current GW (uses live sheet data)
  const validationError = activeGW === currentGW ? validateSquad(squad.filter(p => !p.transferred)) : null

  // Running total across all loaded GWs
  const runningTotal = Object.values(gwDataCache).reduce((sum, gd) => {
    return sum + (gd?.squad || []).reduce((s, p) => s + (p.totalPoints || 0), 0)
  }, 0)

  // GW total for active tab
  const gwTotal = squad.reduce((s, p) => s + (p.totalPoints || 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">← Back</Link>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{managerName}</h1>
            <p className="text-gray-400 text-sm">Manager Detail</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gold-500">{runningTotal}</p>
            <p className="text-xs text-gray-400">total pts</p>
          </div>
        </div>
      </div>

      {fixturesError && (
        <div className="card border-red-800/60 bg-red-900/20 text-red-300 text-sm">
          Could not load fixture data: {fixturesError}
        </div>
      )}

      {validationError && (
        <div className="card border-yellow-700 bg-yellow-900/20 text-yellow-300 text-sm">
          ⚠ {managerName}'s squad is invalid: {validationError}. Please fix the Google Sheet.
        </div>
      )}

      {/* GW Tab Bar */}
      <div className="border-b border-dark-600 flex overflow-x-auto">
        {GAMEWEEKS.filter(g => availableGWs.includes(g.gw)).map(g => {
          const tabTotal = gwDataCache[g.gw]?.squad?.reduce((s, p) => s + (p.totalPoints || 0), 0)
          return (
            <button
              key={g.gw}
              onClick={() => setActiveGW(g.gw)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                ${activeGW === g.gw ? 'tab-active' : 'tab-inactive'}
                ${g.gw === currentGW ? 'font-bold' : ''}`}
            >
              {g.label}
              {tabTotal != null && (
                <span className="ml-1.5 text-xs opacity-60">{tabTotal}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Snapshot warning */}
      {currentData?.snapshotWarning && (
        <div className="card border-yellow-700 bg-yellow-900/20 text-yellow-300 text-sm">
          ⚠ {currentData.snapshotWarning}
        </div>
      )}

      {/* Player table */}
      {loading ? (
        <SkeletonTable rows={6} cols={10} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-600 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-3 py-3 text-left">Pos</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Nation</th>
                <th className="px-3 py-3 text-center">Mins</th>
                <th className="px-3 py-3 text-center">G</th>
                <th className="px-3 py-3 text-center">A</th>
                <th className="px-3 py-3 text-center">CS</th>
                <th className="px-3 py-3 text-center">RC</th>
                <th className="px-3 py-3 text-center">OG</th>
                <th className="px-3 py-3 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {squad.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    No squad data for GW{activeGW} yet.
                  </td>
                </tr>
              ) : (
                squad.map((entry, i) => (
                  <PlayerRow
                    key={i}
                    player={entry}
                    matchStats={entry.matchStats || []}
                    transferred={entry.transferred}
                    transferredIn={entry.transferredIn}
                  />
                ))
              )}
            </tbody>
            {squad.length > 0 && (
              <tfoot>
                <tr className="border-t border-dark-500 bg-dark-700/30">
                  <td colSpan={9} className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
                    GW{activeGW} Total
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-gold-500 text-base">
                    {gwTotal}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Substitution log */}
      {currentData?.substitutions?.length > 0 && (
        <div className="card space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Substitution Log</h3>
          <ul className="space-y-1">
            {currentData.substitutions.map((sub, i) => (
              <li key={i} className="text-sm text-gray-400">
                <span className="text-gray-200 font-medium">GW{sub.gw}:</span>{' '}
                <span className="text-red-400">{sub.out}</span>
                {' OUT → '}
                <span className="text-green-400">{sub.in}</span>
                {' IN'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
