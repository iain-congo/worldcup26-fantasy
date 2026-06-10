const OVERRIDES = {
  "e. martinez": "emiliano martinez",
  "l. martinez": "lautaro martinez",
  "t. hernandez": "theo hernandez",
  "mbappe": "kylian mbappe",
  "vinicius jr": "vinicius junior",
  "livakovic": "dominik livakovic",
  "de bruyne": "kevin de bruyne",
  "kdb": "kevin de bruyne",
  "raphinha": "raphinha",
  "le normand": "robin le normand",
  "guimaraes": "bruno guimaraes",
}

export function normalize(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
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

export function matchPlayerName(sheetName, statsNames, extraOverrides = {}) {
  const norm = normalize(sheetName)
  const allOverrides = { ...OVERRIDES, ...extraOverrides }

  const overrideKey = Object.keys(allOverrides).find(k => normalize(k) === norm)
  const canonical = overrideKey ? normalize(allOverrides[overrideKey]) : norm

  for (const sn of statsNames) {
    const snNorm = normalize(sn)
    if (snNorm === canonical) return sn
    if (snNorm.includes(canonical) || canonical.includes(snNorm)) return sn
    if (canonical.length <= 8 && levenshtein(snNorm, canonical) <= 2) return sn
  }

  return null
}
