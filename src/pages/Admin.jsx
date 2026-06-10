import { useState, useEffect, useCallback } from 'react'
import { GAMEWEEKS } from '../lib/scoring.js'
import { fetchAdminData, lockSnapshot, deleteSnapshot, saveOverride, refreshStats, refreshFixtures } from '../lib/api.js'

// ── Password Gate ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_pw')
    if (stored) onAuth(stored)
  }, [onAuth])

  const submit = e => {
    e.preventDefault()
    if (!pw.trim()) return
    sessionStorage.setItem('admin_pw', pw)
    onAuth(pw)
  }

  return (
    <div className="max-w-sm mx-auto mt-20 card space-y-4">
      <h2 className="text-xl font-bold text-white">Admin Access</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="Admin password"
          className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
        />
        <button type="submit" className="btn-primary w-full">Enter</button>
      </form>
    </div>
  )
}

// ── Section 1: Snapshot Manager ──────────────────────────────────────────────
function SnapshotManager({ password, adminData, onRefresh }) {
  const [locking, setLocking] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [msg, setMsg] = useState('')

  const doLock = async gw => {
    setLocking(gw)
    setMsg('')
    try {
      const res = await lockSnapshot(gw, password)
      if (res.status === 409) setMsg(`GW${gw} is already locked.`)
      else if (!res.ok) setMsg(`Failed to lock GW${gw}: HTTP ${res.status}`)
      else { setMsg(`✅ GW${gw} squad locked.`); onRefresh() }
    } catch (e) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setLocking(null)
      setConfirm(null)
    }
  }

  const doDelete = async gw => {
    setDeleting(gw)
    setMsg('')
    try {
      const res = await deleteSnapshot(gw, password)
      if (!res.ok) setMsg(`Failed to delete GW${gw}: HTTP ${res.status}`)
      else { setMsg(`🗑 GW${gw} snapshot deleted — you can now re-lock.`); onRefresh() }
    } catch (e) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">1 — Gameweek Snapshots</h2>
      {msg && <div className="card text-sm text-gray-200">{msg}</div>}
      <div className="space-y-2">
        {GAMEWEEKS.map(g => {
          const snapshot = adminData?.snapshots?.[g.gw]
          const locked = !!snapshot

          // Determine status label
          const today = new Date().toISOString().slice(0, 10)
          // Simple heuristic: locked=✅, else ⏳ active (current) or 🔒 future
          const statusIcon = locked ? '✅' : '⏳'

          // Count per-manager player counts
          const managerCounts = {}
          if (snapshot) {
            for (const p of snapshot) {
              managerCounts[p.manager] = (managerCounts[p.manager] || 0) + 1
            }
          }

          // Validate squad sizes in snapshot
          const invalids = []
          if (snapshot) {
            const byManager = {}
            for (const p of snapshot) {
              if (!byManager[p.manager]) byManager[p.manager] = []
              byManager[p.manager].push(p)
            }
            for (const [mgr, players] of Object.entries(byManager)) {
              const counts = players.reduce((acc, p) => ({ ...acc, [p.position]: (acc[p.position] || 0) + 1 }), {})
              const gkOk = (counts.GK || 0) === 1
              const defOk = (counts.DEF || 0) === 2
              const fmOk = ((counts.MID || 0) + (counts.FWD || 0)) === 3
              if (!gkOk || !defOk || !fmOk) invalids.push(mgr)
            }
          }

          return (
            <div key={g.gw} className="card space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{statusIcon}</span>
                  <div>
                    <span className="font-semibold text-white">{g.label}</span>
                    <span className="ml-2 text-sm text-gray-400">{g.description}</span>
                    {locked && (
                      <span className="ml-2 text-xs text-gray-500">({snapshot.length} players)</span>
                    )}
                    {invalids.length > 0 && (
                      <span className="ml-2 text-xs text-yellow-400">⚠ Invalid: {invalids.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {locked && (
                    <>
                      <button
                        onClick={() => setExpanded(e => ({ ...e, [g.gw]: !e[g.gw] }))}
                        className="btn-ghost text-xs py-1"
                      >
                        {expanded[g.gw] ? 'Collapse' : 'View'}
                      </button>
                      {confirmDelete === g.gw ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-300">Delete snapshot?</span>
                          <button
                            onClick={() => doDelete(g.gw)}
                            disabled={deleting === g.gw}
                            className="btn-danger text-xs py-1 px-3"
                          >
                            {deleting === g.gw ? 'Deleting…' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmDelete(null)} className="btn-ghost text-xs py-1 px-3">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(g.gw)}
                          className="btn-danger text-xs py-1 px-3"
                        >
                          Delete & Re-lock
                        </button>
                      )}
                    </>
                  )}
                  {!locked && (
                    confirm === g.gw ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-yellow-300">Cannot be undone.</span>
                        <button
                          onClick={() => doLock(g.gw)}
                          disabled={locking === g.gw}
                          className="btn-danger text-xs py-1 px-3"
                        >
                          {locking === g.gw ? 'Locking…' : 'Confirm'}
                        </button>
                        <button onClick={() => setConfirm(null)} className="btn-ghost text-xs py-1 px-3">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirm(g.gw)} className="btn-primary text-xs py-1 px-3">
                        Lock GW{g.gw}
                      </button>
                    )
                  )}
                </div>
              </div>

              {locked && expanded[g.gw] && (
                <div className="mt-2 overflow-x-auto border-t border-dark-600 pt-2">
                  {Object.entries(managerCounts).map(([mgr, count]) => (
                    <div key={mgr} className="text-xs text-gray-300">
                      <span className="font-medium text-white">{mgr}</span>: {count} players
                      {invalids.includes(mgr) && <span className="ml-1 text-yellow-400">⚠</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Section 2: Unmatched Players ─────────────────────────────────────────────
function UnmatchedPlayers({ password, adminData, onRefresh }) {
  const [inputs, setInputs] = useState({})
  const [saving, setSaving] = useState({})
  const [msgs, setMsgs] = useState({})

  const unmatched = adminData?.unmatched || []

  const doSave = async (sheetName) => {
    const statsName = inputs[sheetName] || ''
    if (!statsName.trim()) return
    setSaving(s => ({ ...s, [sheetName]: true }))
    try {
      const res = await saveOverride(sheetName, statsName, password)
      if (res.ok) {
        setMsgs(m => ({ ...m, [sheetName]: '✅ Saved' }))
        onRefresh()
      } else {
        setMsgs(m => ({ ...m, [sheetName]: 'Failed' }))
      }
    } catch (e) {
      setMsgs(m => ({ ...m, [sheetName]: 'Error' }))
    } finally {
      setSaving(s => ({ ...s, [sheetName]: false }))
    }
  }

  if (!unmatched.length) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">2 — Unmatched Players</h2>
        <div className="card text-sm text-gray-400">✅ No unmatched players.</div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">2 — Unmatched Players</h2>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-600 text-xs text-gray-400 uppercase">
              <th className="px-4 py-3 text-left">Manager</th>
              <th className="px-4 py-3 text-left">Sheet Name</th>
              <th className="px-4 py-3 text-left">Nation</th>
              <th className="px-4 py-3 text-left">Pos</th>
              <th className="px-4 py-3 text-left">API Name Override</th>
            </tr>
          </thead>
          <tbody>
            {unmatched.map((u, i) => (
              <tr key={i} className="border-b border-dark-700">
                <td className="px-4 py-3 text-gray-300">{u.manager}</td>
                <td className="px-4 py-3 text-orange-400">{u.player}</td>
                <td className="px-4 py-3 text-gray-300">{u.nation}</td>
                <td className="px-4 py-3 text-gray-300">{u.position}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputs[u.player] ?? ''}
                      onChange={e => setInputs(inp => ({ ...inp, [u.player]: e.target.value }))}
                      placeholder="exact API player name"
                      className="bg-dark-700 border border-dark-500 rounded px-2 py-1 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-gold-500 w-44"
                    />
                    <button
                      onClick={() => doSave(u.player)}
                      disabled={saving[u.player] || !inputs[u.player]?.trim()}
                      className="btn-primary text-xs py-1 px-2"
                    >
                      {saving[u.player] ? '…' : 'Save'}
                    </button>
                    {msgs[u.player] && (
                      <span className="text-xs text-green-400">{msgs[u.player]}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Section 3: API & Cache ───────────────────────────────────────────────────
function CacheSection({ password, adminData, onRefresh }) {
  const [busy, setBusy] = useState({})
  const [msg, setMsg] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = adminData?.apiLog?.[today] || 0

  const run = async (label, fn) => {
    setBusy(b => ({ ...b, [label]: true }))
    setMsg('')
    try {
      const res = await fn()
      if (res.ok) {
        const json = await res.json()
        setMsg(`✅ ${label} — ${JSON.stringify(json)}`)
        onRefresh()
      } else {
        setMsg(`Failed: HTTP ${res.status}`)
      }
    } catch (e) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setBusy(b => ({ ...b, [label]: false }))
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">3 — API & Cache</h2>
      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <span className="text-gray-400">API calls today:</span>{' '}
            <span className={`font-bold ${todayCount > 80 ? 'text-red-400' : todayCount > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
              {todayCount}
            </span>
            <span className="text-gray-500"> / 100</span>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => run('Refresh Stats', () => refreshStats(password))}
            disabled={busy['Refresh Stats']}
            className="btn-danger text-sm"
          >
            {busy['Refresh Stats'] ? 'Clearing…' : 'Force Refresh Stats'}
          </button>
          <button
            onClick={() => run('Refresh Fixtures', () => refreshFixtures(password))}
            disabled={busy['Refresh Fixtures']}
            className="btn-ghost text-sm"
          >
            {busy['Refresh Fixtures'] ? 'Fetching…' : 'Refresh Fixture List'}
          </button>
        </div>
        {msg && <div className="text-xs text-gray-300 font-mono bg-dark-900 rounded p-2">{msg}</div>}
      </div>
    </section>
  )
}

// ── Section 4: API Call Log ──────────────────────────────────────────────────
function ApiCallLog({ adminData }) {
  const log = adminData?.apiLog || {}
  const entries = Object.entries(log).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">4 — API Call Log (last 7 days)</h2>
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-600 text-xs text-gray-400 uppercase">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Calls Made</th>
              <th className="px-4 py-3 text-center">Remaining</th>
              <th className="px-4 py-3 text-left">Usage</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([date, count]) => {
              const remaining = 100 - count
              const pct = Math.min(100, count)
              const barColor = count > 80 ? 'bg-red-500' : count > 60 ? 'bg-yellow-500' : 'bg-green-500'
              return (
                <tr key={date} className="border-b border-dark-700">
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{date}</td>
                  <td className={`px-4 py-3 text-center font-bold ${count > 80 ? 'text-red-400' : 'text-white'}`}>
                    {count}
                  </td>
                  <td className={`px-4 py-3 text-center ${remaining < 20 ? 'text-red-400' : 'text-gray-300'}`}>
                    {remaining}
                  </td>
                  <td className="px-4 py-3 w-40">
                    <div className="bg-dark-600 rounded-full h-1.5 w-full">
                      <div
                        className={`${barColor} h-1.5 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No API call data yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {entries.some(([, c]) => c > 80) && (
        <div className="card border-red-800/60 bg-red-900/20 text-red-300 text-sm">
          ⚠ One or more days exceeded 80 API calls. Check caching is working correctly.
        </div>
      )}
    </section>
  )
}

// ── Main Admin Page ──────────────────────────────────────────────────────────
export default function Admin() {
  const [password, setPassword] = useState(null)
  const [adminData, setAdminData] = useState(null)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async (pw) => {
    try {
      const data = await fetchAdminData(pw)
      setAdminData(data)
      setLoadError('')
    } catch (e) {
      if (e.message === 'Unauthorized') {
        sessionStorage.removeItem('admin_pw')
        setPassword(null)
        setLoadError('Incorrect password.')
      } else {
        setLoadError(e.message)
      }
    }
  }, [])

  const onAuth = useCallback((pw) => {
    setPassword(pw)
    load(pw)
  }, [load])

  if (!password) return <PasswordGate onAuth={onAuth} />

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <button
          onClick={() => { sessionStorage.removeItem('admin_pw'); setPassword(null) }}
          className="btn-ghost text-sm"
        >
          Sign out
        </button>
      </div>

      {loadError && (
        <div className="card border-red-800/60 bg-red-900/20 text-red-300 text-sm">{loadError}</div>
      )}

      {!adminData ? (
        <div className="text-gray-400 text-sm animate-pulse">Loading admin data…</div>
      ) : (
        <>
          <SnapshotManager password={password} adminData={adminData} onRefresh={() => load(password)} />
          <UnmatchedPlayers password={password} adminData={adminData} onRefresh={() => load(password)} />
          <CacheSection password={password} adminData={adminData} onRefresh={() => load(password)} />
          <ApiCallLog adminData={adminData} />
        </>
      )}
    </div>
  )
}
