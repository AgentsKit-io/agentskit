/**
 * Pure helpers for deterministic public API surface snapshots.
 *
 * Discovers public package export subpaths, collects type declaration targets
 * and public conditions, enumerates exported symbols via the TypeScript
 * compiler API, and diffs against a committed baseline.
 *
 * CLI: scripts/check-public-api-snapshot.mjs
 * Baseline: docs/stability/public-api-v1.json
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

/** @typedef {'type' | 'value' | 'asset'} SymbolKind */

/**
 * @typedef {object} SnapshotSymbol
 * @property {string} name
 * @property {SymbolKind[]} kinds
 */

/**
 * @typedef {object} SnapshotSubpath
 * @property {string[]} conditions
 * @property {SnapshotSymbol[]} symbols
 * @property {string[]} [assets]
 */

/**
 * @typedef {object} SnapshotPackage
 * @property {Record<string, SnapshotSubpath>} subpaths
 */

/**
 * @typedef {object} PublicApiSnapshot
 * @property {1} schemaVersion
 * @property {Record<string, SnapshotPackage>} packages
 */

/**
 * @typedef {object} PackageInfo
 * @property {string} dir
 * @property {string} packageName
 * @property {string} packageRoot
 * @property {Record<string, unknown>} manifest
 */

/**
 * @typedef {object} SubpathExport
 * @property {string} subpath
 * @property {unknown} entry
 */

/**
 * @typedef {object} DiffChange
 * @property {'package-added'|'package-removed'|'subpath-added'|'subpath-removed'|'conditions'|'symbols-added'|'symbols-removed'|'symbols-changed'|'assets'} kind
 * @property {string} packageName
 * @property {string} [subpath]
 * @property {string} message
 * @property {string[]} [items]
 */

export const SCHEMA_VERSION = 1
export const DEFAULT_BASELINE_RELATIVE = 'docs/stability/public-api-v1.json'
export const BUILD_PREREQUISITE_COMMAND = 'pnpm --filter "./packages/*" build'

// ---------------------------------------------------------------------------
// Path / sorting helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} subpath
 * @returns {string}
 */
export function normalizeSubpath(subpath) {
  if (subpath === '.' || subpath === '' || subpath === './') return '.'
  if (subpath.startsWith('./')) return subpath
  if (subpath.startsWith('/')) return `.${subpath}`
  return `./${subpath}`
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isLocalFileTarget(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  if (value.startsWith('./') || value.startsWith('../') || value.startsWith('/')) return true
  if (!value.includes(':') && !value.startsWith('#')) {
    if (value.startsWith('dist/') || value.includes('/')) return true
  }
  return false
}

/**
 * @param {string} target
 * @returns {boolean}
 */
export function isDeclarationTarget(target) {
  if (typeof target !== 'string') return false
  const lower = target.toLowerCase().replace(/\\/g, '/')
  return /\.d\.[cm]?ts$/.test(lower)
}

/**
 * @template T
 * @param {T[]} items
 * @param {(a: T, b: T) => number} [compare]
 * @returns {T[]}
 */
export function sortCopy(items, compare) {
  return [...items].sort(compare ?? ((a, b) => String(a).localeCompare(String(b))))
}

/**
 * @param {string[]} kinds
 * @returns {SymbolKind[]}
 */
export function normalizeKinds(kinds) {
  const allowed = new Set(['asset', 'type', 'value'])
  const unique = new Set()
  for (const kind of kinds) {
    if (allowed.has(kind)) unique.add(kind)
  }
  /** @type {SymbolKind[]} */
  const order = ['asset', 'type', 'value']
  return order.filter((k) => unique.has(k))
}

/**
 * @param {SnapshotSymbol[]} symbols
 * @returns {SnapshotSymbol[]}
 */
export function sortSymbols(symbols) {
  return sortCopy(symbols, (a, b) => a.name.localeCompare(b.name)).map((s) => ({
    name: s.name,
    kinds: normalizeKinds(s.kinds),
  }))
}

/**
 * Merge symbol lists by name, unioning kinds.
 * @param {Iterable<SnapshotSymbol>} lists
 * @returns {SnapshotSymbol[]}
 */
export function mergeSymbols(...lists) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map()
  for (const list of lists) {
    for (const symbol of list) {
      let set = map.get(symbol.name)
      if (!set) {
        set = new Set()
        map.set(symbol.name, set)
      }
      for (const kind of symbol.kinds) set.add(kind)
    }
  }
  return sortSymbols(
    [...map.entries()].map(([name, kinds]) => ({
      name,
      kinds: /** @type {SymbolKind[]} */ ([...kinds]),
    })),
  )
}

// ---------------------------------------------------------------------------
// Export map enumeration
// ---------------------------------------------------------------------------

/**
 * Whether an exports object is a subpath map (keys like "." / "./x") vs
 * conditional root export (keys like "import" / "types").
 * @param {Record<string, unknown>} exportsObj
 * @returns {boolean}
 */
export function isSubpathExportsMap(exportsObj) {
  const keys = Object.keys(exportsObj)
  if (keys.length === 0) return false
  return keys.some((key) => key === '.' || key.startsWith('./') || key.startsWith('/'))
}

/**
 * Enumerate public export subpaths from a package manifest.
 * Handles string exports, conditional root, subpath maps, arrays, and
 * classic types/main fallback when exports is absent.
 * @param {Record<string, unknown>} manifest
 * @returns {SubpathExport[]}
 */
export function enumerateExportSubpaths(manifest) {
  /** @type {SubpathExport[]} */
  const out = []
  const exportsField = manifest.exports

  if (exportsField === undefined) {
    const synthetic = {
      types:
        typeof manifest.types === 'string'
          ? manifest.types
          : typeof manifest.typings === 'string'
            ? manifest.typings
            : undefined,
      import: typeof manifest.module === 'string' ? manifest.module : undefined,
      require: typeof manifest.main === 'string' ? manifest.main : undefined,
    }
    // Drop undefined keys
    /** @type {Record<string, unknown>} */
    const cleaned = {}
    for (const [k, v] of Object.entries(synthetic)) {
      if (v !== undefined) cleaned[k] = v
    }
    out.push({ subpath: '.', entry: Object.keys(cleaned).length > 0 ? cleaned : null })
    return out
  }

  if (typeof exportsField === 'string') {
    out.push({ subpath: '.', entry: exportsField })
    return out
  }

  if (Array.isArray(exportsField)) {
    out.push({ subpath: '.', entry: exportsField })
    return out
  }

  if (exportsField && typeof exportsField === 'object') {
    const record = /** @type {Record<string, unknown>} */ (exportsField)
    if (isSubpathExportsMap(record)) {
      for (const [raw, entry] of Object.entries(record)) {
        // Skip package-internal null / false unexport patterns? Keep them as empty surfaces.
        out.push({ subpath: normalizeSubpath(raw), entry })
      }
    } else {
      out.push({ subpath: '.', entry: record })
    }
  }

  return sortCopy(out, (a, b) => a.subpath.localeCompare(b.subpath))
}

/**
 * Collect public condition names from an export entry (not private chunks).
 * @param {unknown} entry
 * @returns {string[]}
 */
export function collectPublicConditions(entry) {
  /** @type {Set<string>} */
  const conditions = new Set()

  /**
   * @param {unknown} node
   */
  function walk(node) {
    if (node == null || typeof node === 'string') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (typeof node !== 'object') return
    for (const [key, child] of Object.entries(node)) {
      // Every non-path object key in an export entry is a public condition
      // (import, types, browser, …) including nested maps.
      if (isLocalFileTarget(key)) continue
      if (key.startsWith('.') || key.startsWith('/')) continue
      conditions.add(key)
      walk(child)
    }
  }

  walk(entry)
  return sortCopy([...conditions])
}

/**
 * Recursively collect all types/typings declaration string targets.
 * @param {unknown} entry
 * @returns {string[]}
 */
export function collectTypeTargets(entry) {
  /** @type {string[]} */
  const targets = []
  const seen = new Set()

  /**
   * @param {unknown} node
   * @param {string | null} parentKey
   */
  function walk(node, parentKey) {
    if (typeof node === 'string') {
      if (
        (parentKey === 'types' || parentKey === 'typings') &&
        isLocalFileTarget(node) &&
        !seen.has(node)
      ) {
        seen.add(node)
        targets.push(node)
      }
      return
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item, parentKey)
      return
    }
    if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        walk(child, key)
      }
    }
  }

  walk(entry, null)
  return sortCopy(targets)
}

/**
 * Collect local string leaf targets (for asset/structural surfaces).
 * @param {unknown} entry
 * @returns {string[]}
 */
export function collectLocalStringTargets(entry) {
  /** @type {string[]} */
  const targets = []
  const seen = new Set()

  /**
   * @param {unknown} node
   */
  function walk(node) {
    if (typeof node === 'string') {
      if (isLocalFileTarget(node) && !seen.has(node)) {
        seen.add(node)
        targets.push(node)
      }
      return
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (node && typeof node === 'object') {
      for (const child of Object.values(node)) walk(child)
    }
  }

  walk(entry)
  return sortCopy(targets)
}

/**
 * When an export has no declaration targets, record asset/structural leaves.
 * @param {unknown} entry
 * @returns {string[]}
 */
export function collectAssetTargets(entry) {
  const typeTargets = collectTypeTargets(entry)
  if (typeTargets.length > 0) return []

  // Classic types on string export that is already a declaration
  if (typeof entry === 'string') {
    if (isDeclarationTarget(entry)) return []
    if (isLocalFileTarget(entry)) return [entry]
    return []
  }

  return collectLocalStringTargets(entry).filter((t) => !isDeclarationTarget(t))
}

/**
 * Asset symbols for surfaces without declaration files.
 * @param {string[]} assets
 * @returns {SnapshotSymbol[]}
 */
export function assetSymbols(assets) {
  return sortSymbols(
    assets.map((target) => ({
      name: `#asset:${normalizeAssetPath(target)}`,
      kinds: /** @type {SymbolKind[]} */ (['asset']),
    })),
  )
}

/**
 * @param {string} target
 * @returns {string}
 */
export function normalizeAssetPath(target) {
  const normalized = target.replace(/\\/g, '/')
  if (normalized.startsWith('./')) return normalized
  if (normalized.startsWith('/')) return `.${normalized}`
  return `./${normalized}`
}

// ---------------------------------------------------------------------------
// Package discovery
// ---------------------------------------------------------------------------

/**
 * Discover non-private packages under packages/*, sorted by package name.
 * @param {string} packagesRoot
 * @param {{ readdirSync: Function, readFileSync: Function, join?: Function }} fsApi
 * @returns {PackageInfo[]}
 */
export function discoverPublicPackages(packagesRoot, fsApi) {
  const join = fsApi.join ?? path.join
  const entries = fsApi.readdirSync(packagesRoot, { withFileTypes: true })
  /** @type {PackageInfo[]} */
  const packages = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const packageRoot = join(packagesRoot, entry.name)
    const manifestPath = join(packageRoot, 'package.json')
    let raw
    try {
      raw = fsApi.readFileSync(manifestPath, 'utf8')
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') continue
      throw error
    }
    const manifest = JSON.parse(raw)
    if (manifest.private === true) continue
    if (typeof manifest.name !== 'string' || !manifest.name) {
      throw new Error(`public package in ${entry.name}/ is missing a name`)
    }
    packages.push({
      dir: entry.name,
      packageName: manifest.name,
      packageRoot,
      manifest,
    })
  }

  packages.sort((a, b) => a.packageName.localeCompare(b.packageName))
  return packages
}

/**
 * Fail early when declaration (or sample publication) outputs are missing.
 * @param {PackageInfo[]} packages
 * @param {{ existsSync: (p: string) => boolean, resolve?: Function }} fsApi
 * @returns {string[]} missing diagnostic lines (empty when ok)
 */
export function findMissingBuildOutputs(packages, fsApi) {
  const resolve = fsApi.resolve ?? path.resolve
  /** @type {string[]} */
  const missing = []

  for (const pkg of packages) {
    const subpaths = enumerateExportSubpaths(pkg.manifest)
    /** @type {string[]} */
    const candidates = []

    for (const { entry } of subpaths) {
      candidates.push(...collectTypeTargets(entry))
      if (typeof entry === 'string' && isLocalFileTarget(entry)) candidates.push(entry)
      else candidates.push(...collectLocalStringTargets(entry).slice(0, 1))
    }

    // Classic fields as last resort sample
    for (const field of ['types', 'typings', 'module', 'main']) {
      const value = pkg.manifest[field]
      if (typeof value === 'string') candidates.push(value)
    }

    const sample = candidates.find((t) => t.includes('dist/')) ?? candidates[0]
    if (!sample) {
      missing.push(`${pkg.packageName} (no publication targets in source manifest)`)
      continue
    }
    const abs = resolve(pkg.packageRoot, sample)
    if (!fsApi.existsSync(abs)) {
      missing.push(`${pkg.packageName} → ${sample}`)
    }
  }

  return missing
}

// ---------------------------------------------------------------------------
// TypeScript symbol classification
// ---------------------------------------------------------------------------

/**
 * Load the repository's installed TypeScript package.
 * @param {string} [fromFilename] absolute path used as require anchor
 * @returns {typeof import('typescript')}
 */
export function loadTypeScript(fromFilename = fileURLToPath(import.meta.url)) {
  const req = createRequire(fromFilename)
  try {
    return req('typescript')
  } catch {
    // Fall back to repo-root resolution from this library file
    return require('typescript')
  }
}

/**
 * Classify a TypeScript export symbol as type / value (or both).
 * Preserves the exported name; resolves aliases only for flags.
 * @param {typeof import('typescript')} ts
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').Symbol} symbol
 * @returns {SnapshotSymbol}
 */
export function classifyExportSymbol(ts, checker, symbol) {
  const name = symbol.getName()
  let resolved = symbol
  if (symbol.flags & ts.SymbolFlags.Alias) {
    try {
      resolved = checker.getAliasedSymbol(symbol)
    } catch {
      resolved = symbol
    }
  }

  const flags = resolved.flags
  /** @type {SymbolKind[]} */
  const kinds = []

  if (flags & ts.SymbolFlags.Type) kinds.push('type')
  if (flags & ts.SymbolFlags.Value) kinds.push('value')

  // Namespace modules export a value container even when Type flag is absent.
  if (
    flags & (ts.SymbolFlags.NamespaceModule | ts.SymbolFlags.ValueModule) &&
    !kinds.includes('value')
  ) {
    kinds.push('value')
  }

  // Fallback: alias that could not be resolved — inspect original flags.
  if (kinds.length === 0) {
    if (symbol.flags & ts.SymbolFlags.Type) kinds.push('type')
    if (symbol.flags & ts.SymbolFlags.Value) kinds.push('value')
  }

  if (kinds.length === 0) {
    // Last resort: treat unknown exports as value to avoid silent drop.
    kinds.push('value')
  }

  return { name, kinds: normalizeKinds(kinds) }
}

/**
 * Enumerate public symbols from a declaration module source file.
 * @param {typeof import('typescript')} ts
 * @param {import('typescript').TypeChecker} checker
 * @param {import('typescript').SourceFile} sourceFile
 * @returns {SnapshotSymbol[]}
 */
export function getExportsFromSourceFile(ts, checker, sourceFile) {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile) ?? sourceFile.symbol
  if (!moduleSymbol) {
    throw new Error(`unable to resolve module symbol for ${sourceFile.fileName}`)
  }
  const exports = checker.getExportsOfModule(moduleSymbol)
  return sortSymbols(exports.map((symbol) => classifyExportSymbol(ts, checker, symbol)))
}

/**
 * Create a single TypeScript Program for unique declaration roots.
 * @param {typeof import('typescript')} ts
 * @param {string[]} rootNames absolute paths
 * @param {import('typescript').CompilerOptions} [extraOptions]
 * @returns {import('typescript').Program}
 */
export function createDeclarationProgram(ts, rootNames, extraOptions = {}) {
  const unique = sortCopy([...new Set(rootNames.map((p) => path.resolve(p)))])
  return ts.createProgram({
    rootNames: unique,
    options: {
      noEmit: true,
      skipLibCheck: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      allowJs: false,
      resolveJsonModule: true,
      esModuleInterop: true,
      ...extraOptions,
    },
  })
}

// ---------------------------------------------------------------------------
// Snapshot build
// ---------------------------------------------------------------------------

/**
 * @param {PackageInfo[]} packages
 * @param {{
 *   ts?: typeof import('typescript'),
 *   existsSync: (p: string) => boolean,
 *   resolve?: (...parts: string[]) => string,
 * }} io
 * @returns {{ snapshot: PublicApiSnapshot, errors: string[], stats: { packages: number, subpaths: number, symbols: number } }}
 */
export function buildPublicApiSnapshot(packages, io) {
  const ts = io.ts ?? loadTypeScript()
  const resolve = io.resolve ?? path.resolve
  /** @type {string[]} */
  const errors = []

  /** @type {{ packageName: string, subpath: string, absTargets: string[], conditions: string[], assets: string[] }[]} */
  const work = []
  /** @type {string[]} */
  const allRoots = []

  for (const pkg of packages) {
    for (const { subpath, entry } of enumerateExportSubpaths(pkg.manifest)) {
      const conditions = collectPublicConditions(entry)
      /** @type {string[]} */
      const typeTargets = [...collectTypeTargets(entry)]

      // Classic fallback: string declaration export
      if (
        typeTargets.length === 0 &&
        typeof entry === 'string' &&
        isDeclarationTarget(entry)
      ) {
        typeTargets.push(entry)
      }

      // Package-level types/typings for root when the export entry omitted them
      if (typeTargets.length === 0 && subpath === '.') {
        if (typeof pkg.manifest.types === 'string' && isDeclarationTarget(pkg.manifest.types)) {
          typeTargets.push(pkg.manifest.types)
        } else if (
          typeof pkg.manifest.typings === 'string' &&
          isDeclarationTarget(pkg.manifest.typings)
        ) {
          typeTargets.push(pkg.manifest.typings)
        }
      }

      const sortedTypes = sortCopy([...new Set(typeTargets)])
      // Assets only when no declaration surface is declared for this subpath
      const assets =
        sortedTypes.length === 0
          ? collectAssetTargets(entry).map(normalizeAssetPath)
          : []

      /** @type {string[]} */
      const absTargets = []
      for (const target of sortedTypes) {
        const abs = resolve(pkg.packageRoot, target)
        if (!io.existsSync(abs)) {
          errors.push(`${pkg.packageName} ${subpath}: missing declaration ${target}`)
          continue
        }
        absTargets.push(abs)
        allRoots.push(abs)
      }

      if (absTargets.length === 0 && assets.length === 0) {
        errors.push(
          `${pkg.packageName} ${subpath}: no declaration targets and no asset/structural surface`,
        )
      }

      work.push({
        packageName: pkg.packageName,
        subpath,
        absTargets,
        conditions,
        assets: sortCopy(assets),
      })
    }
  }

  // Do not produce a partial baseline when declarations fail.
  if (errors.length > 0) {
    return {
      snapshot: { schemaVersion: SCHEMA_VERSION, packages: {} },
      errors,
      stats: { packages: 0, subpaths: 0, symbols: 0 },
    }
  }

  const program =
    allRoots.length > 0
      ? createDeclarationProgram(ts, allRoots)
      : null
  const checker = program ? program.getTypeChecker() : null

  /** @type {Record<string, SnapshotPackage>} */
  const packagesOut = {}
  let symbolCount = 0
  let subpathCount = 0

  /** @type {Map<string, typeof work>} */
  const byPackage = new Map()
  for (const item of work) {
    let list = byPackage.get(item.packageName)
    if (!list) {
      list = []
      byPackage.set(item.packageName, list)
    }
    list.push(item)
  }

  for (const packageName of sortCopy([...byPackage.keys()])) {
    const items = byPackage.get(packageName) ?? []
    /** @type {Record<string, SnapshotSubpath>} */
    const subpaths = {}

    for (const item of sortCopy(items, (a, b) => a.subpath.localeCompare(b.subpath))) {
      /** @type {SnapshotSymbol[]} */
      let symbols = []

      if (item.absTargets.length > 0 && program && checker) {
        /** @type {SnapshotSymbol[][]} */
        const lists = []
        for (const abs of item.absTargets) {
          const sourceFile = program.getSourceFile(abs)
          if (!sourceFile) {
            errors.push(
              `${item.packageName} ${item.subpath}: unreadable module source file ${abs}`,
            )
            continue
          }
          try {
            lists.push(getExportsFromSourceFile(ts, checker, sourceFile))
          } catch (error) {
            errors.push(
              `${item.packageName} ${item.subpath}: ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        }
        symbols = mergeSymbols(...lists)
      }

      if (item.assets.length > 0) {
        symbols = mergeSymbols(symbols, assetSymbols(item.assets))
      }

      /** @type {SnapshotSubpath} */
      const sub = {
        conditions: item.conditions,
        symbols,
      }
      if (item.assets.length > 0) {
        sub.assets = item.assets
      }

      subpaths[item.subpath] = sub
      subpathCount += 1
      symbolCount += symbols.length
    }

    packagesOut[packageName] = { subpaths }
  }

  if (errors.length > 0) {
    return {
      snapshot: { schemaVersion: SCHEMA_VERSION, packages: {} },
      errors,
      stats: { packages: 0, subpaths: 0, symbols: 0 },
    }
  }

  return {
    snapshot: {
      schemaVersion: SCHEMA_VERSION,
      packages: packagesOut,
    },
    errors,
    stats: {
      packages: Object.keys(packagesOut).length,
      subpaths: subpathCount,
      symbols: symbolCount,
    },
  }
}

/**
 * Deterministic JSON serialization (trailing newline).
 * @param {PublicApiSnapshot} snapshot
 * @returns {string}
 */
export function serializeSnapshot(snapshot) {
  /** @type {PublicApiSnapshot} */
  const normalized = {
    schemaVersion: SCHEMA_VERSION,
    packages: {},
  }

  for (const packageName of sortCopy(Object.keys(snapshot.packages))) {
    const pkg = snapshot.packages[packageName]
    /** @type {Record<string, SnapshotSubpath>} */
    const subpaths = {}
    for (const subpath of sortCopy(Object.keys(pkg.subpaths))) {
      const entry = pkg.subpaths[subpath]
      /** @type {SnapshotSubpath} */
      const out = {
        conditions: sortCopy(entry.conditions ?? []),
        symbols: sortSymbols(entry.symbols ?? []),
      }
      if (entry.assets && entry.assets.length > 0) {
        out.assets = sortCopy(entry.assets.map(normalizeAssetPath))
      }
      subpaths[subpath] = out
    }
    normalized.packages[packageName] = { subpaths }
  }

  return `${JSON.stringify(normalized, null, 2)}\n`
}

/**
 * @param {string} text
 * @returns {PublicApiSnapshot}
 */
export function parseSnapshot(text) {
  const data = JSON.parse(text)
  if (!data || typeof data !== 'object') {
    throw new Error('baseline is not an object')
  }
  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `unsupported baseline schemaVersion ${JSON.stringify(data.schemaVersion)}; expected ${SCHEMA_VERSION}`,
    )
  }
  if (!data.packages || typeof data.packages !== 'object') {
    throw new Error('baseline missing packages object')
  }
  return /** @type {PublicApiSnapshot} */ (data)
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

/**
 * @param {PublicApiSnapshot} baseline
 * @param {PublicApiSnapshot} current
 * @returns {DiffChange[]}
 */
export function diffSnapshots(baseline, current) {
  /** @type {DiffChange[]} */
  const changes = []

  const basePackages = new Set(Object.keys(baseline.packages ?? {}))
  const currPackages = new Set(Object.keys(current.packages ?? {}))

  for (const name of sortCopy([...currPackages])) {
    if (!basePackages.has(name)) {
      changes.push({
        kind: 'package-added',
        packageName: name,
        message: 'package added',
      })
    }
  }
  for (const name of sortCopy([...basePackages])) {
    if (!currPackages.has(name)) {
      changes.push({
        kind: 'package-removed',
        packageName: name,
        message: 'package removed',
      })
    }
  }

  for (const packageName of sortCopy([...currPackages].filter((n) => basePackages.has(n)))) {
    const baseSubs = baseline.packages[packageName]?.subpaths ?? {}
    const currSubs = current.packages[packageName]?.subpaths ?? {}
    const baseKeys = new Set(Object.keys(baseSubs))
    const currKeys = new Set(Object.keys(currSubs))

    for (const subpath of sortCopy([...currKeys])) {
      if (!baseKeys.has(subpath)) {
        changes.push({
          kind: 'subpath-added',
          packageName,
          subpath,
          message: 'subpath added',
        })
      }
    }
    for (const subpath of sortCopy([...baseKeys])) {
      if (!currKeys.has(subpath)) {
        changes.push({
          kind: 'subpath-removed',
          packageName,
          subpath,
          message: 'subpath removed',
        })
      }
    }

    for (const subpath of sortCopy([...currKeys].filter((s) => baseKeys.has(s)))) {
      const baseEntry = baseSubs[subpath]
      const currEntry = currSubs[subpath]

      const baseCond = sortCopy(baseEntry.conditions ?? []).join(',')
      const currCond = sortCopy(currEntry.conditions ?? []).join(',')
      if (baseCond !== currCond) {
        changes.push({
          kind: 'conditions',
          packageName,
          subpath,
          message: 'conditions changed',
          items: [
            `baseline: [${sortCopy(baseEntry.conditions ?? []).join(', ')}]`,
            `current:  [${sortCopy(currEntry.conditions ?? []).join(', ')}]`,
          ],
        })
      }

      const baseAssets = sortCopy((baseEntry.assets ?? []).map(normalizeAssetPath)).join('\0')
      const currAssets = sortCopy((currEntry.assets ?? []).map(normalizeAssetPath)).join('\0')
      if (baseAssets !== currAssets) {
        const baseSet = new Set((baseEntry.assets ?? []).map(normalizeAssetPath))
        const currSet = new Set((currEntry.assets ?? []).map(normalizeAssetPath))
        /** @type {string[]} */
        const items = []
        for (const a of sortCopy([...currSet])) {
          if (!baseSet.has(a)) items.push(`+ ${a}`)
        }
        for (const a of sortCopy([...baseSet])) {
          if (!currSet.has(a)) items.push(`- ${a}`)
        }
        changes.push({
          kind: 'assets',
          packageName,
          subpath,
          message: 'assets changed',
          items,
        })
      }

      const baseSym = new Map((baseEntry.symbols ?? []).map((s) => [s.name, normalizeKinds(s.kinds)]))
      const currSym = new Map((currEntry.symbols ?? []).map((s) => [s.name, normalizeKinds(s.kinds)]))

      /** @type {string[]} */
      const added = []
      /** @type {string[]} */
      const removed = []
      /** @type {string[]} */
      const kindChanged = []

      for (const name of sortCopy([...currSym.keys()])) {
        if (!baseSym.has(name)) {
          added.push(`${name} [${(currSym.get(name) ?? []).join('|')}]`)
        } else {
          const b = (baseSym.get(name) ?? []).join('|')
          const c = (currSym.get(name) ?? []).join('|')
          if (b !== c) {
            kindChanged.push(`${name}: ${b} → ${c}`)
          }
        }
      }
      for (const name of sortCopy([...baseSym.keys()])) {
        if (!currSym.has(name)) {
          removed.push(`${name} [${(baseSym.get(name) ?? []).join('|')}]`)
        }
      }

      if (added.length > 0) {
        changes.push({
          kind: 'symbols-added',
          packageName,
          subpath,
          message: `added ${added.length} symbol(s)`,
          items: added,
        })
      }
      if (removed.length > 0) {
        changes.push({
          kind: 'symbols-removed',
          packageName,
          subpath,
          message: `removed ${removed.length} symbol(s)`,
          items: removed,
        })
      }
      if (kindChanged.length > 0) {
        changes.push({
          kind: 'symbols-changed',
          packageName,
          subpath,
          message: `changed kinds on ${kindChanged.length} symbol(s)`,
          items: kindChanged,
        })
      }
    }
  }

  return changes
}

/**
 * Format concise diagnostics identifying package/subpath.
 * @param {DiffChange[]} changes
 * @returns {string[]}
 */
export function formatDiffDiagnostics(changes) {
  /** @type {string[]} */
  const lines = []
  for (const change of changes) {
    const loc = change.subpath
      ? `${change.packageName} · ${change.subpath}`
      : change.packageName
    lines.push(`${loc}: ${change.message}`)
    if (change.items) {
      const limit = 20
      const shown = change.items.slice(0, limit)
      for (const item of shown) {
        lines.push(`  ${item}`)
      }
      if (change.items.length > limit) {
        lines.push(`  …and ${change.items.length - limit} more`)
      }
    }
  }
  return lines
}

/**
 * @param {{ packages: number, subpaths: number, symbols: number }} stats
 * @returns {string}
 */
export function formatStats(stats) {
  return `${stats.packages} package(s), ${stats.subpaths} subpath(s), ${stats.symbols} symbol(s)`
}
