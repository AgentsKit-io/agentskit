import type { Finding } from './scan'

/**
 * Ratchet baseline: existing findings are recorded per file and rule; a
 * check fails when any count grows or a new file/rule appears. Counts may
 * only go down (`--update` refuses to raise them).

 * Stored portability-finding counts grouped by rule and file. */
export interface Baseline {
  version: 1
  /** Directories scanned, relative to the repository root. */
  include: string[]
  /** Path prefixes skipped (e.g. the cross-platform package itself). */
  exclude: string[]
  /** file → rule → allowed count. */
  entries: Record<string, Record<string, number>>
}

// File paths and rule ids come from scanned input; prototype-less maps keep a
// file named `__proto__` from reaching Object.prototype.
function emptyMap<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>
}

/** Count findings by rule and file for storage in a baseline.
 *
 * @param findings Findings to count.
 * @returns Rule-to-file counts. */
export function countFindings(findings: readonly Finding[]): Record<string, Record<string, number>> {
  const counts = emptyMap<Record<string, number>>()
  for (const finding of findings) {
    const perFile = (counts[finding.file] ??= emptyMap<number>())
    perFile[finding.rule] = (perFile[finding.rule] ?? 0) + 1
  }
  return counts
}

/** New and resolved findings produced by a baseline comparison. */
export interface Comparison {
  /** Findings in files/rules whose count exceeds the baseline. */
  regressions: Finding[]
  /** file/rule pairs now below their baseline count. */
  improvements: Array<{ file: string; rule: string; allowed: number; actual: number }>
}

/** Compare current findings with a stored portability baseline.
 *
 * @param findings Current findings.
 * @param baseline Stored baseline.
 * @returns Regressions and improvements. */
export function compareToBaseline(findings: readonly Finding[], baseline: Baseline): Comparison {
  const counts = countFindings(findings)
  const regressions: Finding[] = []
  for (const [file, rules] of Object.entries(counts)) {
    for (const [rule, actual] of Object.entries(rules)) {
      const allowed = baseline.entries[file]?.[rule] ?? 0
      if (actual > allowed) regressions.push(...findings.filter(f => f.file === file && f.rule === rule))
    }
  }
  const improvements: Comparison['improvements'] = []
  for (const [file, rules] of Object.entries(baseline.entries)) {
    for (const [rule, allowed] of Object.entries(rules)) {
      const actual = counts[file]?.[rule] ?? 0
      if (actual < allowed) improvements.push({ file, rule, allowed, actual })
    }
  }
  return { regressions, improvements }
}

/** New baseline from the current findings. Refuses (returns the old one) when a count would grow, unless `allowIncrease`. */
export function tightenBaseline(
  findings: readonly Finding[],
  baseline: Baseline,
  allowIncrease: boolean,
): { baseline: Baseline; increased: string[] } {
  const counts = countFindings(findings)
  const increased: string[] = []
  for (const [file, rules] of Object.entries(counts)) {
    for (const [rule, actual] of Object.entries(rules)) {
      if (actual > (baseline.entries[file]?.[rule] ?? 0)) increased.push(`${file} [${rule}]`)
    }
  }
  if (increased.length > 0 && !allowIncrease) return { baseline, increased }
  const entries = emptyMap<Record<string, number>>()
  for (const file of Object.keys(counts).sort()) entries[file] = counts[file] ?? {}
  return { baseline: { ...baseline, entries }, increased }
}
