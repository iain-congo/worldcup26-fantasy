export const BUILT_IN_OVERRIDES = {
  "e. martinez":   "emiliano martinez",
  "l. martinez":   "lautaro martinez",
  "t. hernandez":  "theo hernandez",
  "mbappe":        "kylian mbappe",
  "vinicius jr":   "vinicius junior",
  "livakovic":     "dominik livakovic",
  "de bruyne":     "kevin de bruyne",
  "kdb":           "kevin de bruyne",
  "raphinha":      "raphinha",
  "le normand":    "robin le normand",
  "guimaraes":     "bruno guimaraes",
  "kamada":        "daichi kamada",
  "benoun":        "badr benoun",
  "simon":         "unai simon",
  "kobel":         "gregor kobel",
  "verbruggen":    "bart verbruggen",
}

export function normalize(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')    // remove diacritics
    .replace(/[-']/g, ' ')              // hyphens/apostrophes → space
    .replace(/[^\w\s]/g, '')            // remove other punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

const POS_MAP = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' }

// Match a sheet player against an array of API player objects { name, team, api_position }
// squadNation and squadPosition are used to restrict the initial+surname fallback
// extraOverrides: { sheetName: apiName } from KV
export function matchPlayerName(sheetName, apiPlayers, extraOverrides = {}, squadNation = null, squadPosition = null) {
  const norm = normalize(sheetName)

  // Support both plain name strings and full player objects
  const toName = p => (typeof p === 'string' ? p : p.name)

  // Check overrides first (extra overrides take priority over built-ins)
  const allOverrides = { ...BUILT_IN_OVERRIDES, ...extraOverrides }
  const overrideKey = Object.keys(allOverrides).find(k => normalize(k) === norm)
  const canonical = overrideKey ? normalize(allOverrides[overrideKey]) : norm

  for (const p of apiPlayers) {
    const apiNorm = normalize(toName(p))

    // 1. Exact match
    if (apiNorm === canonical) return toName(p)

    // 2. One contains the other
    if (apiNorm.includes(canonical) || canonical.includes(apiNorm)) return toName(p)

    // 3. Levenshtein <= 2
    if (canonical.length >= 4 && levenshtein(apiNorm, canonical) <= 2) return toName(p)
  }

  // 4. Initial + surname match (e.g. "F. Wirtz" → "Florian Wirtz")
  //    Restricted to same team and position to avoid wrong-player matches
  const initialMatch = norm.match(/^([a-z])\s+(\S+.*)$/)
  if (initialMatch) {
    const [, initial, surname] = initialMatch
    const normSurname = normalize(surname)

    const candidates = apiPlayers.filter(p => {
      if (typeof p === 'string') return false
      const parts = normalize(p.name).split(' ')
      if (parts.length < 2) return false

      const firstInitial = parts[0][0]
      const lastWord = parts[parts.length - 1]

      if (firstInitial !== initial) return false
      if (lastWord !== normSurname) return false

      // Must be same team
      if (squadNation && p.team && normalize(p.team) !== normalize(squadNation)) return false

      // Must be same position
      if (squadPosition && p.api_position) {
        const apiPos = POS_MAP[(p.api_position || '').toUpperCase()]
        if (apiPos && apiPos !== squadPosition) return false
      }

      return true
    })

    if (candidates.length === 1) return candidates[0].name
  }

  return null
}
