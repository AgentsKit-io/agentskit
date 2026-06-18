/**
 * Zero-dependency fuzzy string matching — Jaro-Winkler similarity. For approximate
 * name matching against a list (sanctions / KYC / watchlist screening, dedup,
 * entity resolution) WITHOUT an LLM call: deterministic, auditable, and cheap.
 *
 * ```ts
 * import { fuzzyMatchList } from '@agentskit/core'
 * const hits = fuzzyMatchList('Vladimir Putin', sanctionsList, { threshold: 0.9 })
 * if (hits.length) block() // never auto-clear an approximate match
 * ```
 */

/** Jaro similarity (0..1) of two strings. */
function jaro(a: string, b: string): number {
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0
  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aMatches = new Array<boolean>(a.length).fill(false)
  const bMatches = new Array<boolean>(b.length).fill(false)
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, b.length)
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue
      aMatches[i] = true
      bMatches[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0
  // Count transpositions.
  let transpositions = 0
  let k = 0
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue
    while (!bMatches[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }
  transpositions /= 2
  return (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3
}

/**
 * Jaro-Winkler similarity (0..1) — Jaro with a bonus for a shared prefix (up to 4
 * chars). Case- and whitespace-insensitive by default. 1 = identical, 0 = nothing
 * in common.
 */
export function jaroWinkler(a: string, b: string, opts: { caseSensitive?: boolean } = {}): number {
  const norm = (s: string) => (opts.caseSensitive ? s : s.toLowerCase()).trim().replace(/\s+/g, ' ')
  const x = norm(a)
  const y = norm(b)
  const j = jaro(x, y)
  if (j === 0) return 0
  let prefix = 0
  for (let i = 0; i < Math.min(4, x.length, y.length); i++) {
    if (x[i] === y[i]) prefix++
    else break
  }
  return j + prefix * 0.1 * (1 - j)
}

export interface FuzzyMatch {
  candidate: string
  score: number
}

/**
 * Score `query` against every candidate and return the matches at or above
 * `threshold` (default 0.85), highest score first, capped at `topK` (default 10).
 */
export function fuzzyMatchList(
  query: string,
  candidates: readonly string[],
  opts: { threshold?: number; topK?: number; caseSensitive?: boolean } = {},
): FuzzyMatch[] {
  const threshold = opts.threshold ?? 0.85
  const topK = opts.topK ?? 10
  const scored: FuzzyMatch[] = []
  for (const candidate of candidates) {
    const score = jaroWinkler(query, candidate, { caseSensitive: opts.caseSensitive })
    if (score >= threshold) scored.push({ candidate, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}
