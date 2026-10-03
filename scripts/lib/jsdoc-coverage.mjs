import { sortCopy } from './public-api-snapshot.mjs'

export const JSDOC_BASELINE_RELATIVE = 'docs/stability/jsdoc-coverage-v1.json'

/**
 * Produce a deterministic per-package report from the versioned public API
 * snapshot and the declaration symbols that carry JSDoc.
 * @param {import('./public-api-snapshot.mjs').PublicApiSnapshot} snapshot
 * @param {Record<string, Record<string, string[]>>} documentation
 */
export function calculateCoverage(snapshot, documentation) {
  /** @type {Record<string, { documented: number, total: number, undocumented: string[] }>} */
  const packages = {}
  for (const packageName of sortCopy(Object.keys(snapshot.packages))) {
    const undocumented = []
    let total = 0
    for (const subpath of sortCopy(Object.keys(snapshot.packages[packageName].subpaths))) {
      const symbols = snapshot.packages[packageName].subpaths[subpath].symbols
        .filter((symbol) => !symbol.name.startsWith('#asset:'))
      const documentedNames = new Set(documentation[packageName]?.[subpath] ?? [])
      for (const symbol of symbols) {
        total += 1
        if (!documentedNames.has(symbol.name)) undocumented.push(`${subpath}::${symbol.name}`)
      }
    }
    packages[packageName] = {
      documented: total - undocumented.length,
      total,
      undocumented: sortCopy(undocumented),
    }
  }
  return packages
}

/** @param {Record<string, string[]>} baseline */
export function serializeJsdocBaseline(baseline) {
  const packages = {}
  for (const name of sortCopy(Object.keys(baseline))) packages[name] = sortCopy(baseline[name])
  return `${JSON.stringify({ schemaVersion: 1, packages }, null, 2)}\n`
}

/**
 * Reject any current undocumented symbol that is not already in the baseline.
 * @param {Record<string, { undocumented: string[] }>} coverage
 * @param {Record<string, string[]>} baseline
 */
export function findBaselineGrowth(coverage, baseline) {
  const errors = []
  for (const packageName of sortCopy(Object.keys(coverage))) {
    const allowed = new Set(baseline[packageName] ?? [])
    for (const symbol of coverage[packageName].undocumented) {
      if (!allowed.has(symbol)) errors.push(`${packageName}: newly undocumented ${symbol}`)
    }
  }
  return errors
}
