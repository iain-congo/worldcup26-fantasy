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
    .replace(/[̀-ͯ]/g, '')   // remove diacritics
    .replace(/[-']/g, ' ')             // hyphens/apostrophes → space
    .replace(/[^\w\s]/g, '')           // remove other punctuation
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

// Match a sheet player name against an array of API player names
// extraOverrides: { sheetName: apiName } from KV
export function matchPlayerName(sheetName, apiNames, extraOverrides = {}) {
  const norm = normalize(sheetName)

  // Check overrides first (extra overrides take priority over built-ins)
  const allOverrides = { ...BUILT_IN_OVERRIDES, ...extraOverrides }
  const overrideKey = Object.keys(allOverrides).find(k => normalize(k) === norm)
  const canonical = overrideKey ? normalize(allOverrides[overrideKey]) : norm

  for (const apiName of apiNames) {
    const apiNorm = normalize(apiName)

    // 1. Exact match
    if (apiNorm === canonical) return apiName

    // 2. One contains the other
    if (apiNorm.includes(canonical) || canonical.includes(apiNorm)) return apiName

    // 3. Levenshtein <= 2 (only for short-ish names to avoid false positives)
    if (canonical.length >= 4 && levenshtein(apiNorm, canonical) <= 2) return apiName
  }

  return null
}
