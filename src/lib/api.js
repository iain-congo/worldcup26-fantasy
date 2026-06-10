export async function fetchLeaderboard() {
  const res = await fetch('/api/leaderboard')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchFixtures() {
  const res = await fetch('/api/fixtures')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchManagerGW(manager, gw) {
  const res = await fetch(`/api/manager?manager=${encodeURIComponent(manager)}&gw=${gw}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchAdminData(password) {
  const res = await fetch('/api/admin/data', {
    headers: { 'x-admin-password': password },
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function lockSnapshot(gw, password) {
  return fetch(`/api/snapshot?gw=${gw}`, {
    method: 'POST',
    headers: { 'x-admin-password': password },
  })
}

export async function saveOverride(sheetName, statsName, password) {
  return fetch('/api/admin/override', {
    method: 'POST',
    headers: {
      'x-admin-password': password,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sheetName, statsName }),
  })
}

export async function refreshStats(password) {
  return fetch('/api/admin/refresh', {
    method: 'POST',
    headers: { 'x-admin-password': password },
  })
}

export async function refreshFixtures(password) {
  return fetch('/api/admin/refresh-fixtures', {
    method: 'POST',
    headers: { 'x-admin-password': password },
  })
}
