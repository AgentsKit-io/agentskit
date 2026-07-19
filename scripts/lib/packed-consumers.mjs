/**
 * Pure helpers for the packed-consumer publication contract.
 *
 * The CLI (`scripts/check-packed-consumers.mjs`) packs public packages, extracts
 * tarballs safely, and uses these helpers to validate manifests, targets, and
 * derived runtime/typecheck modes. Unit tests cover the pure surface only.
 */

import {
  ALLOWED_PACK_ROOT_FILES,
  STRUCTURAL_EXPORT_CONDITIONS,
  TYPECHECK_EXEMPT_PACKAGES,
  findException,
  normalizeSubpath,
  toImportSpecifier,
} from './packed-consumers-matrix.mjs'

const DEPENDENCY_FIELDS = Object.freeze([
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'devDependencies',
  'bundleDependencies',
  'bundledDependencies',
])

const NODE_SHEBANG_RE = /^#!.*\bnode(?:\s|$)/

// ---------------------------------------------------------------------------
// Path / archive safety
// ---------------------------------------------------------------------------

/**
 * Reject absolute paths and `..` traversal in archive entry names.
 * @param {string} entry
 * @returns {boolean} true when the entry is unsafe
 */
export function isUnsafeArchiveEntry(entry) {
  if (typeof entry !== 'string' || entry.length === 0) return true
  if (entry.includes('\0')) return true

  // Absolute POSIX or Windows paths
  if (entry.startsWith('/') || entry.startsWith('\\')) return true
  if (/^[a-zA-Z]:[\\/]/.test(entry)) return true

  // URL-like or home expansion
  if (entry.includes('://') || entry.startsWith('~')) return true

  const normalized = entry.replace(/\\/g, '/')
  const segments = normalized.split('/')
  for (const segment of segments) {
    if (segment === '..') return true
  }
  return false
}

/**
 * Strip the conventional `package/` prefix from an npm tarball entry.
 * @param {string} entry
 * @returns {string}
 */
export function stripPackagePrefix(entry) {
  const normalized = entry.replace(/\\/g, '/')
  if (normalized === 'package') return ''
  if (normalized.startsWith('package/')) return normalized.slice('package/'.length)
  return normalized
}

/**
 * Dist-centric allowlist for packed entries (relative to package root).
 * Permits npm automatic metadata files and anything under dist/.
 * @param {string} relativePath path relative to package root (no package/ prefix)
 * @returns {boolean}
 */
export function isAllowedPackedPath(relativePath) {
  if (typeof relativePath !== 'string') return false
  if (relativePath === '' || relativePath === '.') return true

  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '')
  if (normalized === '' || normalized.endsWith('/')) {
    // directory markers: only dist/ tree and root
    if (normalized === '' || normalized === 'dist' || normalized === 'dist/' || normalized.startsWith('dist/')) {
      return true
    }
    return false
  }

  const lowerBase = normalized.toLowerCase()
  if (!normalized.includes('/')) {
    return ALLOWED_PACK_ROOT_FILES.has(lowerBase)
  }

  return normalized === 'dist' || normalized.startsWith('dist/')
}

/**
 * Ensure a resolved path stays inside packageRoot.
 * @param {string} packageRoot absolute package root
 * @param {string} candidate absolute or joined path
 * @param {{ resolve?: (a: string, b: string) => string, relative?: (from: string, to: string) => string }} [pathApi]
 * @returns {boolean}
 */
export function isPathInsidePackage(packageRoot, candidate, pathApi = {}) {
  const resolve = pathApi.resolve ?? ((a, b) => {
    // Minimal posix-ish join for pure tests without importing node:path
    if (b.startsWith('/')) return b
    const base = a.endsWith('/') ? a.slice(0, -1) : a
    const parts = `${base}/${b}`.split('/')
    const out = []
    for (const part of parts) {
      if (part === '' || part === '.') {
        if (part === '' && out.length === 0) out.push('')
        continue
      }
      if (part === '..') {
        if (out.length > 1) out.pop()
        continue
      }
      out.push(part)
    }
    return out.join('/') || '/'
  })
  const relative = pathApi.relative ?? ((from, to) => {
    const fromParts = resolve(from, '.').split('/').filter(Boolean)
    const toParts = resolve(to, '.').split('/').filter(Boolean)
    let i = 0
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++
    const ups = fromParts.length - i
    return `${'../'.repeat(ups)}${toParts.slice(i).join('/')}`
  })

  const root = resolve(packageRoot, '.')
  // When candidate is already absolute under root, use it directly
  const absolute = candidate.startsWith(root) ? candidate : resolve(root, candidate.replace(/^\.\//, ''))
  const rel = relative(root, absolute)
  if (rel === '') return true
  if (rel.startsWith('..') || rel.includes('/../') || rel.includes('\\..\\')) return false
  if (isUnsafeArchiveEntry(rel)) return false
  return true
}

// ---------------------------------------------------------------------------
// Workspace protocol detection
// ---------------------------------------------------------------------------

/**
 * Recursively find `workspace:` protocol strings in a value.
 * @param {unknown} value
 * @param {string} [path]
 * @returns {{ path: string, value: string }[]}
 */
export function findWorkspaceProtocolRefs(value, path = '') {
  /** @type {{ path: string, value: string }[]} */
  const hits = []

  if (typeof value === 'string') {
    if (value.startsWith('workspace:')) {
      hits.push({ path: path || '(root)', value })
    }
    return hits
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(...findWorkspaceProtocolRefs(item, path ? `${path}[${index}]` : `[${index}]`))
    })
    return hits
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key
      hits.push(...findWorkspaceProtocolRefs(child, childPath))
    }
  }

  return hits
}

/**
 * Scan dependency fields of a package manifest for workspace: protocols.
 * @param {Record<string, unknown>} manifest
 * @returns {{ path: string, value: string }[]}
 */
export function findWorkspaceProtocolInManifest(manifest) {
  /** @type {{ path: string, value: string }[]} */
  const hits = []
  if (!manifest || typeof manifest !== 'object') return hits

  for (const field of DEPENDENCY_FIELDS) {
    if (field in manifest) {
      hits.push(...findWorkspaceProtocolRefs(manifest[field], field))
    }
  }
  // Also scan whole manifest for nested workspace: (pnpm catalog edge cases)
  for (const [key, value] of Object.entries(manifest)) {
    if (DEPENDENCY_FIELDS.includes(key)) continue
    if (key === 'pnpm' || key === 'scripts' || key === 'agentskit') continue
    hits.push(...findWorkspaceProtocolRefs(value, key))
  }
  return hits
}

// ---------------------------------------------------------------------------
// Export / publication target collection
// ---------------------------------------------------------------------------

/**
 * Recursively collect local file targets from an exports tree.
 * Skips non-path strings (e.g. condition names are keys, not values).
 * @param {unknown} node
 * @param {{ includeConditions?: string[] }} [options]
 * @returns {string[]}
 */
export function collectExportTargets(node, options = {}) {
  /** @type {string[]} */
  const targets = []
  const seen = new Set()

  /**
   * @param {unknown} value
   * @param {string | null} condition
   */
  function walk(value, condition) {
    if (typeof value === 'string') {
      if (isLocalFileTarget(value) && !seen.has(value)) {
        seen.add(value)
        targets.push(value)
      }
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, condition)
      return
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        walk(child, key)
      }
    }
  }

  walk(node, null)
  return targets
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isLocalFileTarget(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  // package exports local paths start with ./ or /
  if (value.startsWith('./') || value.startsWith('../') || value.startsWith('/')) return true
  // bare relative without protocol
  if (!value.includes(':') && !value.startsWith('#')) {
    // "dist/index.js" style sometimes appears
    if (value.startsWith('dist/') || value.includes('/')) return true
  }
  return false
}

/**
 * Collect all local targets declared by exports + classic fields + bin.
 * @param {Record<string, unknown>} manifest
 * @returns {{ field: string, subpath: string | null, target: string }[]}
 */
export function collectPublicationTargets(manifest) {
  /** @type {{ field: string, subpath: string | null, target: string }[]} */
  const items = []
  const push = (field, subpath, target) => {
    if (typeof target === 'string' && isLocalFileTarget(target)) {
      items.push({ field, subpath, target })
    }
  }

  for (const field of ['main', 'module', 'types', 'typings', 'svelte']) {
    if (typeof manifest[field] === 'string') {
      push(field, null, manifest[field])
    }
  }

  if (typeof manifest.bin === 'string') {
    push('bin', null, manifest.bin)
  } else if (manifest.bin && typeof manifest.bin === 'object') {
    for (const [name, target] of Object.entries(manifest.bin)) {
      push(`bin.${name}`, null, target)
    }
  }

  if (manifest.exports !== undefined) {
    if (typeof manifest.exports === 'string') {
      push('exports', '.', manifest.exports)
    } else if (Array.isArray(manifest.exports)) {
      for (const target of collectExportTargets(manifest.exports)) {
        push('exports', null, target)
      }
    } else if (manifest.exports && typeof manifest.exports === 'object') {
      for (const [subpath, value] of Object.entries(manifest.exports)) {
        for (const target of collectExportTargets(value)) {
          push('exports', subpath, target)
        }
      }
    }
  }

  return items
}

/**
 * Detect missing publication targets against a filesystem probe.
 * @param {{ field: string, subpath: string | null, target: string }[]} targets
 * @param {{ packageRoot: string, exists: (absPath: string) => boolean, isFile?: (absPath: string) => boolean, resolvePath: (packageRoot: string, rel: string) => string }} io
 * @returns {{ field: string, subpath: string | null, target: string, reason: string }[]}
 */
export function findMissingTargets(targets, io) {
  /** @type {{ field: string, subpath: string | null, target: string, reason: string }[]} */
  const missing = []
  for (const item of targets) {
    if (isUnsafeArchiveEntry(item.target.replace(/^\.\//, '')) || item.target.includes('..')) {
      // still try to validate containment via resolve
    }
    let abs
    try {
      abs = io.resolvePath(io.packageRoot, item.target)
    } catch {
      missing.push({ ...item, reason: 'unresolvable-target' })
      continue
    }
    if (!io.exists(abs)) {
      missing.push({ ...item, reason: 'missing' })
      continue
    }
    if (io.isFile && !io.isFile(abs)) {
      missing.push({ ...item, reason: 'not-a-file' })
    }
  }
  return missing
}

// ---------------------------------------------------------------------------
// Bin shebang
// ---------------------------------------------------------------------------

/**
 * @param {string} content
 * @returns {boolean}
 */
export function hasNodeShebang(content) {
  if (typeof content !== 'string' || content.length === 0) return false
  // Support UTF-8 BOM
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  return NODE_SHEBANG_RE.test(firstLine)
}

// ---------------------------------------------------------------------------
// Mode derivation + exceptions
// ---------------------------------------------------------------------------

/**
 * Derive validation modes for a single export map entry.
 * @param {unknown} exportEntry
 * @param {{ packageName: string, subpath: string }} ctx
 * @returns {{ mode: string, target?: string, condition?: string, exceptionId?: string }[]}
 */
export function deriveModesForExport(exportEntry, ctx) {
  const exception = findException(ctx.packageName, ctx.subpath)
  if (exception?.modes) {
    return exception.modes.map((mode) => ({
      mode,
      exceptionId: exception.id,
    }))
  }

  /** @type {{ mode: string, target?: string, condition?: string, exceptionId?: string }[]} */
  const modes = []

  if (typeof exportEntry === 'string') {
    if (exportEntry.endsWith('.css')) {
      modes.push({ mode: 'css-file', target: exportEntry })
    } else {
      modes.push({ mode: 'esm', target: exportEntry })
    }
    return modes
  }

  if (!exportEntry || typeof exportEntry !== 'object') {
    return [{ mode: 'structural' }]
  }

  const record = /** @type {Record<string, unknown>} */ (exportEntry)

  for (const condition of STRUCTURAL_EXPORT_CONDITIONS) {
    if (record[condition] !== undefined) {
      for (const target of collectExportTargets(record[condition])) {
        modes.push({ mode: 'structural', target, condition })
      }
    }
  }

  if (typeof record.import === 'string') {
    modes.push({ mode: 'esm', target: record.import })
  } else if (record.import && typeof record.import === 'object') {
    for (const target of collectExportTargets(record.import)) {
      modes.push({ mode: 'esm', target })
    }
  }

  if (typeof record.require === 'string') {
    modes.push({ mode: 'cjs', target: record.require })
  } else if (record.require && typeof record.require === 'object') {
    for (const target of collectExportTargets(record.require)) {
      modes.push({ mode: 'cjs', target })
    }
  }

  if (typeof record.svelte === 'string') {
    modes.push({ mode: 'esm', target: record.svelte })
  }

  if (typeof record.default === 'string' && !record.import) {
    if (record.default.endsWith('.css')) {
      modes.push({ mode: 'css-file', target: record.default })
    } else {
      modes.push({ mode: 'esm', target: record.default })
    }
  }

  if (typeof record.types === 'string' || typeof record.typings === 'string') {
    modes.push({
      mode: 'types',
      target: /** @type {string} */ (record.types ?? record.typings),
    })
  }

  if (modes.length === 0) {
    modes.push({ mode: 'structural' })
  }

  // Apply skip flags from exception when modes were derived (not fully overridden)
  if (exception) {
    return modes
      .filter((item) => {
        if (exception.skipEsm && item.mode === 'esm') return false
        if (exception.skipCjs && item.mode === 'cjs') return false
        return true
      })
      .map((item) => ({ ...item, exceptionId: exception.id }))
  }

  return modes
}

/**
 * Build the full list of runtime/typecheck work items for a packed manifest.
 * @param {string} packageName
 * @param {Record<string, unknown>} manifest
 */
export function buildValidationPlan(packageName, manifest) {
  /** @type {{ packageName: string, subpath: string, specifier: string, modes: ReturnType<typeof deriveModesForExport>, exceptionId?: string }[]} */
  const plan = []

  const exportsField = manifest.exports
  if (exportsField === undefined) {
    const subpath = '.'
    const synthetic = {
      import: typeof manifest.module === 'string' ? manifest.module : undefined,
      require: typeof manifest.main === 'string' ? manifest.main : undefined,
      types: typeof manifest.types === 'string' ? manifest.types : undefined,
    }
    const modes = deriveModesForExport(synthetic, { packageName, subpath })
    const exception = findException(packageName, subpath)
    plan.push({
      packageName,
      subpath,
      specifier: toImportSpecifier(packageName, subpath),
      modes,
      exceptionId: exception?.id,
    })
    return plan
  }

  if (typeof exportsField === 'string') {
    const subpath = '.'
    const modes = deriveModesForExport(exportsField, { packageName, subpath })
    plan.push({
      packageName,
      subpath,
      specifier: toImportSpecifier(packageName, subpath),
      modes,
      exceptionId: findException(packageName, subpath)?.id,
    })
    return plan
  }

  if (exportsField && typeof exportsField === 'object' && !Array.isArray(exportsField)) {
    for (const [rawSubpath, entry] of Object.entries(exportsField)) {
      const subpath = normalizeSubpath(rawSubpath)
      const modes = deriveModesForExport(entry, { packageName, subpath })
      plan.push({
        packageName,
        subpath,
        specifier: toImportSpecifier(packageName, subpath),
        modes,
        exceptionId: findException(packageName, subpath)?.id,
      })
    }
  }

  return plan
}

/**
 * Whether a plan entry should be included in consumer typecheck fixtures.
 * @param {{ packageName: string, subpath: string, modes: { mode: string }[] }} entry
 */
export function shouldTypecheckEntry(entry) {
  if (TYPECHECK_EXEMPT_PACKAGES.has(entry.packageName)) return false
  const exception = findException(entry.packageName, entry.subpath)
  if (exception?.skipTypecheck) return false
  if (entry.modes.every((m) => m.mode === 'css-file' || m.mode === 'structural' || m.mode === 'angular-apf')) {
    return false
  }
  // Prefer entries that declare types or esm/cjs runtime surfaces
  return entry.modes.some((m) => m.mode === 'esm' || m.mode === 'cjs' || m.mode === 'types')
}

/**
 * Format a deterministic diagnostic line.
 * @param {{ packageName: string, subpath?: string | null, mode?: string, message: string }} diag
 */
export function formatDiagnostic(diag) {
  const parts = [diag.packageName]
  if (diag.subpath != null && diag.subpath !== '') parts.push(diag.subpath)
  if (diag.mode) parts.push(diag.mode)
  return `${parts.join(' · ')}: ${diag.message}`
}

/**
 * Validate tarball entry list against safety + allowlist rules.
 * @param {string[]} entries raw tar -tzf lines
 * @returns {string[]} diagnostic messages
 */
export function validateTarballEntries(entries) {
  /** @type {string[]} */
  const errors = []
  for (const entry of entries) {
    const trimmed = entry.replace(/\/$/, '')
    if (!trimmed) continue
    if (isUnsafeArchiveEntry(trimmed)) {
      errors.push(formatDiagnostic({
        packageName: '(tarball)',
        mode: 'archive-safety',
        message: `rejects unsafe entry ${JSON.stringify(entry)}`,
      }))
      continue
    }
    const relative = stripPackagePrefix(trimmed)
    if (relative === '' || relative === '.') continue
    // Ignore directory-only markers for allowlist when they are package/ or package/dist/
    if (!isAllowedPackedPath(relative)) {
      errors.push(formatDiagnostic({
        packageName: '(tarball)',
        mode: 'dist-allowlist',
        message: `rejects non-dist entry ${JSON.stringify(relative)}`,
      }))
    }
  }
  return errors
}

export {
  ALLOWED_PACK_ROOT_FILES,
  STRUCTURAL_EXPORT_CONDITIONS,
  TYPECHECK_EXEMPT_PACKAGES,
  findException,
  normalizeSubpath,
  toImportSpecifier,
  PACKED_CONSUMER_EXCEPTIONS,
} from './packed-consumers-matrix.mjs'
