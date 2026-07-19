/**
 * Pure helpers for ecosystem stability gates:
 *  1. promotion RFC validation for stable packages
 *  2. stable → stable internal dependency validation
 *  3. graduation evidence manifest validation (ADR 0024)
 *  4. stability-readiness scorecard row computation
 *
 * Check CLIs load the monorepo and call these; unit tests exercise the pure
 * surface with fixtures and never mutate the repository.
 */

/** Sole documented exemption from the promotion-RFC requirement. */
export const PROMOTION_RFC_EXEMPT = Object.freeze(
  new Map([
    [
      '@agentskit/core',
      'ADR-backed graduation (ADRs 0001-0006 + docs/RELEASE-CORE-V1.md)',
    ],
  ]),
)

/** Sole documented exemption from the graduation-evidence requirement. */
export const EVIDENCE_EXEMPT = PROMOTION_RFC_EXEMPT

/** Seven repository evidence axes required by docs/stability/README.md schema v1. */
export const EVIDENCE_AXIS_KEYS = Object.freeze([
  'publicApi',
  'packageSmoke',
  'completeness',
  'resilience',
  'compatibility',
  'sustainability',
  'breakingChangeAudit',
])

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SEMVER_RE = /^\d+\.\d+\.\d+$/
const MS_PER_DAY = 86_400_000

const VALID_TIERS = new Set(['alpha', 'beta', 'stable'])
const INTERNAL_DEP_SECTIONS = Object.freeze([
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
])

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Dedicated promotion RFC filenames must be exactly:
 *   NNNN-<package-directory>-stable.md
 * e.g. packages/react → 0012-react-stable.md
 */
export function isDedicatedStableRfcFilename(fileName, packageDir) {
  if (typeof fileName !== 'string' || typeof packageDir !== 'string') return false
  if (!/^[a-z0-9-]+$/i.test(packageDir)) return false
  return new RegExp(`^\\d{4}-${escapeRegExp(packageDir)}-stable\\.md$`).test(fileName)
}

/**
 * Parse the first metadata Status line:
 *   - **Status**: Accepted
 * Returns the raw status token (trimmed) or null when absent.
 */
export function extractRfcStatus(text) {
  if (typeof text !== 'string') return null
  const match = text.match(/^- \*\*Status\*\*:\s*(.+?)\s*$/m)
  return match ? match[1].trim() : null
}

/**
 * Exact package metadata line (repository markdown style):
 *   - **Package**: `@agentskit/foo`
 *   - **Package**: @agentskit/foo
 * A general body mention is not enough.
 */
export function hasExactPackageMetadata(text, packageName) {
  if (typeof text !== 'string' || typeof packageName !== 'string') return false
  const escaped = escapeRegExp(packageName)
  const re = new RegExp(`^- \\*\\*Package\\*\\*:\\s*\`?${escaped}\`?\\s*$`, 'm')
  return re.test(text)
}

/**
 * Decide whether a single RFC document satisfies promotion for one package.
 * Does not mutate inputs.
 *
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function evaluatePromotionRfc({ fileName, text, packageDir, packageName }) {
  if (!isDedicatedStableRfcFilename(fileName, packageDir)) {
    return {
      ok: false,
      reason:
        `filename must be exactly NNNN-${packageDir}-stable.md ` +
        `(got "${fileName ?? '(missing)'}"); a general RFC that merely mentions the package is not enough`,
    }
  }

  if (!hasExactPackageMetadata(text, packageName)) {
    return {
      ok: false,
      reason:
        `missing exact package metadata line ` +
        `("- **Package**: \`${packageName}\`" or without backticks)`,
    }
  }

  const status = extractRfcStatus(text)
  if (status !== 'Accepted') {
    return {
      ok: false,
      reason:
        status == null
          ? 'missing exact status metadata line ("- **Status**: Accepted")'
          : `status must be exactly "Accepted" (got "${status}"); a dedicated Proposed RFC does not promote`,
    }
  }

  return { ok: true }
}

/**
 * Audit every stable workspace package for a dedicated Accepted promotion RFC.
 *
 * @param {object} input
 * @param {Array<{ name: string, dir: string, stability: string }>} input.packages
 * @param {Array<{ file: string, text: string }>} input.rfcs
 * @param {Map<string, string>} [input.exempt=PROMOTION_RFC_EXEMPT]
 * @returns {string[]} actionable error messages (empty = pass)
 */
export function auditPromotionRfcs({ packages, rfcs, exempt = PROMOTION_RFC_EXEMPT } = {}) {
  if (!Array.isArray(packages) || !Array.isArray(rfcs)) {
    throw new Error('auditPromotionRfcs requires packages[] and rfcs[]')
  }

  const errors = []
  for (const pkg of packages) {
    if (!pkg || pkg.stability !== 'stable') continue
    if (exempt.has(pkg.name)) continue

    const candidates = rfcs.filter((rfc) => isDedicatedStableRfcFilename(rfc.file, pkg.dir))
    if (candidates.length === 0) {
      const looseMention = rfcs.some(
        (rfc) =>
          typeof rfc.text === 'string' &&
          (rfc.text.includes(pkg.name) || (typeof pkg.dir === 'string' && rfc.file.includes(pkg.dir))),
      )
      errors.push(
        `${pkg.name}: declared "stable" but no dedicated promotion RFC ` +
          `rfcs/NNNN-${pkg.dir}-stable.md` +
          (looseMention
            ? ' (a general RFC that merely mentions the package is not enough)'
            : '') +
          `. Write that file with "- **Package**: \`${pkg.name}\`" and "- **Status**: Accepted", ` +
          `or revert agentskit.stability to beta.`,
      )
      continue
    }

    let accepted = false
    const reasons = []
    for (const rfc of candidates) {
      const result = evaluatePromotionRfc({
        fileName: rfc.file,
        text: rfc.text,
        packageDir: pkg.dir,
        packageName: pkg.name,
      })
      if (result.ok) {
        accepted = true
        break
      }
      reasons.push(`${rfc.file}: ${result.reason}`)
    }

    if (!accepted) {
      errors.push(
        `${pkg.name}: dedicated promotion RFC present but not valid — ${reasons.join('; ')}`,
      )
    }
  }
  return errors
}

/**
 * Collect direct internal `@agentskit/*` dependency names from the production
 * sections only (dependencies / optionalDependencies / peerDependencies).
 * Ignores devDependencies entirely.
 */
export function collectInternalAgentskitDeps(pkgJson) {
  const names = new Set()
  if (!pkgJson || typeof pkgJson !== 'object') return names
  for (const section of INTERNAL_DEP_SECTIONS) {
    const block = pkgJson[section]
    if (!block || typeof block !== 'object') continue
    for (const name of Object.keys(block)) {
      if (name.startsWith('@agentskit/')) names.add(name)
    }
  }
  return names
}

/**
 * For each package with agentskit.stability === "stable", every direct internal
 * @agentskit/* dependency (deps / optional / peer) must also be stable.
 * External packages and peers are permitted. devDependencies are ignored.
 *
 * @param {object} input
 * @param {Array<{
 *   name: string,
 *   stability: string,
 *   dependencies?: Record<string, string>,
 *   optionalDependencies?: Record<string, string>,
 *   peerDependencies?: Record<string, string>,
 *   devDependencies?: Record<string, string>,
 * }>} input.packages
 * @returns {string[]} actionable error messages (empty = pass)
 */
export function auditStableDependencies({ packages } = {}) {
  if (!Array.isArray(packages)) {
    throw new Error('auditStableDependencies requires packages[]')
  }

  const tierByName = new Map()
  for (const pkg of packages) {
    if (!pkg?.name) continue
    if (pkg.stability && VALID_TIERS.has(pkg.stability)) {
      tierByName.set(pkg.name, pkg.stability)
    }
  }

  const errors = []
  for (const pkg of packages) {
    if (!pkg || pkg.stability !== 'stable') continue

    for (const depName of collectInternalAgentskitDeps(pkg)) {
      if (!tierByName.has(depName)) {
        errors.push(
          `${pkg.name}: stable package depends on unknown internal package ${depName}. ` +
            'Every @agentskit/* runtime dependency must be present in the workspace and declare a stable tier.',
        )
        continue
      }
      const depTier = tierByName.get(depName)
      if (depTier !== 'stable') {
        errors.push(
          `${pkg.name}: stable package depends on ${depName} (${depTier}) via ` +
            `dependencies/optionalDependencies/peerDependencies — every internal ` +
            `@agentskit/* dependency of a stable package must also be stable. ` +
            `Promote ${depName} first, drop the dependency, or move it to devDependencies ` +
            `if it is test-only.`,
        )
      }
    }
  }
  return errors
}

// ---------------------------------------------------------------------------
// Gate 3 — graduation evidence (ADR 0024 / docs/stability/README.md)
// ---------------------------------------------------------------------------

/**
 * True when value is a real UTC calendar date string YYYY-MM-DD
 * (rejects 2026-02-30 and other impossible calendar days).
 */
export function isUtcCalendarDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

/**
 * Whole UTC calendar days from start to end (both YYYY-MM-DD).
 * Positive when end is after start.
 */
export function utcCalendarDaysBetween(start, end) {
  const a = Date.parse(`${start}T00:00:00Z`)
  const b = Date.parse(`${end}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN
  return Math.round((b - a) / MS_PER_DAY)
}

/**
 * Semver-like x.y.z (no prerelease / build metadata).
 */
export function isSemverLike(version) {
  return typeof version === 'string' && SEMVER_RE.test(version)
}

/**
 * major.minor line id for a semver-like version (e.g. "0.8.1" → "0.8").
 */
export function majorMinorLine(version) {
  if (!isSemverLike(version)) return null
  const [major, minor] = version.split('.')
  return `${major}.${minor}`
}

/**
 * Normalized safe repository-relative path:
 *  - non-empty string
 *  - not absolute (/… or Windows drive)
 *  - no ".." segments
 *  - no empty segments / backslashes (must already be normalized)
 */
export function isSafeRepoRelativePath(path) {
  if (typeof path !== 'string' || path.length === 0) return false
  if (path.startsWith('/') || path.startsWith('\\')) return false
  if (/^[a-zA-Z]:[\\/]/.test(path)) return false
  if (path.includes('\\')) return false
  if (path.includes('\0')) return false
  const parts = path.split('/')
  if (parts.length === 0) return false
  for (const part of parts) {
    if (part === '' || part === '.' || part === '..') return false
  }
  return true
}

/**
 * Validate a graduation evidence document (schema version 1).
 * Pure: never touches the filesystem. When `pathExists` is provided, each
 * evidence path is checked through that callback; omit it to skip existence.
 *
 * @param {object} input
 * @param {unknown} input.doc
 * @param {string} input.packageName
 * @param {string} [input.today] YYYY-MM-DD (defaults to current UTC calendar day)
 * @param {(path: string) => boolean} [input.pathExists]
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateStabilityEvidence({
  doc,
  packageName,
  today = new Date().toISOString().slice(0, 10),
  pathExists,
} = {}) {
  const errors = []
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, errors: [`${packageName}: evidence document must be a JSON object`] }
  }

  if (doc.schemaVersion !== 1) {
    errors.push(
      `${packageName}: schemaVersion must be exactly 1 (got ${JSON.stringify(doc.schemaVersion)})`,
    )
  }

  if (doc.package !== packageName) {
    errors.push(
      `${packageName}: package field must exactly match package.json name ` +
        `(got ${JSON.stringify(doc.package)})`,
    )
  }

  if (!isUtcCalendarDate(doc.betaSince)) {
    errors.push(
      `${packageName}: betaSince must be a real UTC calendar date YYYY-MM-DD ` +
        `(got ${JSON.stringify(doc.betaSince)})`,
    )
  }
  if (!isUtcCalendarDate(doc.proposedStableDate)) {
    errors.push(
      `${packageName}: proposedStableDate must be a real UTC calendar date YYYY-MM-DD ` +
        `(got ${JSON.stringify(doc.proposedStableDate)})`,
    )
  }

  const datesOk = isUtcCalendarDate(doc.betaSince) && isUtcCalendarDate(doc.proposedStableDate)
  if (datesOk) {
    if (!isUtcCalendarDate(today)) {
      errors.push(
        `${packageName}: injected today must be a real UTC calendar date YYYY-MM-DD ` +
          `(got ${JSON.stringify(today)})`,
      )
    } else {
      const daysToToday = utcCalendarDaysBetween(doc.proposedStableDate, today)
      if (daysToToday < 0) {
        errors.push(
          `${packageName}: proposedStableDate ${doc.proposedStableDate} is in the future ` +
            `relative to ${today}; cannot promote before the proposed date`,
        )
      }
    }

    const soakDays = utcCalendarDaysBetween(doc.betaSince, doc.proposedStableDate)
    if (soakDays < 90) {
      errors.push(
        `${packageName}: proposedStableDate must be at least 90 full calendar days after ` +
          `betaSince (betaSince=${doc.betaSince}, proposedStableDate=${doc.proposedStableDate}, ` +
          `elapsed=${soakDays} days)`,
      )
    }
  }

  if (!Array.isArray(doc.qualifyingMinorReleases)) {
    errors.push(
      `${packageName}: qualifyingMinorReleases must be an array with at least two entries`,
    )
  } else if (doc.qualifyingMinorReleases.length < 2) {
    errors.push(
      `${packageName}: qualifyingMinorReleases must have at least two entries ` +
        `(got ${doc.qualifyingMinorReleases.length})`,
    )
  } else {
    const lines = new Set()
    doc.qualifyingMinorReleases.forEach((entry, index) => {
      const label = `${packageName}: qualifyingMinorReleases[${index}]`
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`${label}: must be an object with version and date`)
        return
      }
      if (!isSemverLike(entry.version)) {
        errors.push(
          `${label}: version must be semver-like x.y.z (got ${JSON.stringify(entry.version)})`,
        )
      } else {
        lines.add(majorMinorLine(entry.version))
      }
      if (!isUtcCalendarDate(entry.date)) {
        errors.push(
          `${label}: date must be a real UTC calendar date YYYY-MM-DD ` +
            `(got ${JSON.stringify(entry.date)})`,
        )
      } else if (datesOk) {
        if (
          utcCalendarDaysBetween(doc.betaSince, entry.date) < 0 ||
          utcCalendarDaysBetween(entry.date, doc.proposedStableDate) < 0
        ) {
          errors.push(
            `${label}: date ${entry.date} must fall within betaSince..proposedStableDate ` +
              `inclusive (${doc.betaSince}..${doc.proposedStableDate})`,
          )
        }
      }
    })
    if (lines.size < 2) {
      errors.push(
        `${packageName}: qualifyingMinorReleases must span at least two distinct major.minor ` +
          `lines (e.g. 0.8.x and 0.9.x); two patches on one minor line do not qualify ` +
          `(got lines: ${[...lines].join(', ') || '(none)'})`,
      )
    }
  }

  const evidence = doc.evidence
  if (evidence === null || typeof evidence !== 'object' || Array.isArray(evidence)) {
    errors.push(
      `${packageName}: evidence must be an object with the seven required axis paths`,
    )
  } else {
    for (const key of EVIDENCE_AXIS_KEYS) {
      const path = evidence[key]
      if (typeof path !== 'string' || path.trim().length === 0) {
        errors.push(
          `${packageName}: evidence.${key} must be a non-empty repository-relative path`,
        )
        continue
      }
      if (!isSafeRepoRelativePath(path)) {
        errors.push(
          `${packageName}: evidence.${key} must be a normalized safe repository-relative path ` +
            `(no absolute path, no "..", no empty segments); got ${JSON.stringify(path)}`,
        )
        continue
      }
      if (typeof pathExists === 'function' && !pathExists(path)) {
        errors.push(
          `${packageName}: evidence.${key} path does not exist as a file: ${path}`,
        )
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}

/**
 * Audit every non-exempt stable package for a valid graduation evidence file.
 *
 * @param {object} input
 * @param {Array<{ name: string, dir: string, stability: string }>} input.packages
 * @param {(pkg: { name: string, dir: string }) =>
 *   | { kind: 'missing' }
 *   | { kind: 'invalid-json', detail?: string }
 *   | { kind: 'ok', doc: unknown }
 * } input.loadEvidence
 * @param {(path: string) => boolean} [input.pathExists]
 * @param {string} [input.today]
 * @param {Map<string, string>} [input.exempt=EVIDENCE_EXEMPT]
 * @returns {string[]} actionable error messages (empty = pass)
 */
export function auditStabilityEvidence({
  packages,
  loadEvidence,
  pathExists,
  today,
  exempt = EVIDENCE_EXEMPT,
} = {}) {
  if (!Array.isArray(packages) || typeof loadEvidence !== 'function') {
    throw new Error('auditStabilityEvidence requires packages[] and loadEvidence()')
  }

  const errors = []
  for (const pkg of packages) {
    if (!pkg || pkg.stability !== 'stable') continue
    if (exempt.has(pkg.name)) continue

    const loaded = loadEvidence(pkg)
    if (!loaded || loaded.kind === 'missing') {
      errors.push(
        `${pkg.name}: declared "stable" but missing graduation evidence file ` +
          `docs/stability/${pkg.dir}.json. Add that file per docs/stability/README.md ` +
          `(schemaVersion 1), or revert agentskit.stability to beta. ` +
          `@agentskit/core is the sole evidence exemption.`,
      )
      continue
    }
    if (loaded.kind === 'invalid-json') {
      errors.push(
        `${pkg.name}: docs/stability/${pkg.dir}.json is not valid JSON` +
          (loaded.detail ? ` (${loaded.detail})` : '') +
          '. Fix the file or revert agentskit.stability to beta.',
      )
      continue
    }

    const result = validateStabilityEvidence({
      doc: loaded.doc,
      packageName: pkg.name,
      today,
      pathExists,
    })
    if (!result.ok) errors.push(...result.errors)
  }
  return errors
}

// ---------------------------------------------------------------------------
// Stability-readiness scorecard (generated; never mutates package tiers)
// ---------------------------------------------------------------------------

/**
 * Whether a package's direct internal deps would satisfy the stable-deps rule
 * if this package were treated as a stable candidate.
 */
export function hasStableInternalDependencies(pkg, packages) {
  if (!pkg || !Array.isArray(packages)) return false
  const tierByName = new Map()
  for (const p of packages) {
    if (p?.name && p.stability && VALID_TIERS.has(p.stability)) {
      tierByName.set(p.name, p.stability)
    }
  }
  for (const depName of collectInternalAgentskitDeps(pkg)) {
    if (tierByName.get(depName) !== 'stable') return false
  }
  return true
}

/**
 * Whether any RFC in the list is a dedicated Accepted promotion RFC for pkg.
 */
export function hasAcceptedPromotionRfc(pkg, rfcs) {
  if (!pkg || !Array.isArray(rfcs)) return false
  return rfcs.some((rfc) => {
    const result = evaluatePromotionRfc({
      fileName: rfc.file,
      text: rfc.text,
      packageDir: pkg.dir,
      packageName: pkg.name,
    })
    return result.ok
  })
}

/**
 * Compute one deterministic scorecard row for a workspace package evaluated
 * as a *candidate* for stable (without modifying any files or tiers).
 *
 * Cell vocabulary: yes | no | pending | exempt
 *
 * @returns {{
 *   package: string,
 *   tier: string,
 *   conventions: string,
 *   stableDeps: string,
 *   promotionRfc: string,
 *   evidence: string,
 *   soak: string,
 *   axes: string,
 *   ready: string,
 * }}
 */
export function evaluateStabilityReadinessRow({
  pkg,
  packages = [],
  rfcs = [],
  evidenceDoc = null,
  evidenceMissing = false,
  pathExists = () => false,
  today = new Date().toISOString().slice(0, 10),
  conventionsPresent = false,
} = {}) {
  if (!pkg?.name) {
    throw new Error('evaluateStabilityReadinessRow requires pkg.name')
  }

  const tier = typeof pkg.stability === 'string' ? pkg.stability : '(missing)'
  const conventions = conventionsPresent ? 'yes' : 'no'
  const stableDeps = hasStableInternalDependencies(pkg, packages) ? 'yes' : 'no'

  if (EVIDENCE_EXEMPT.has(pkg.name) || PROMOTION_RFC_EXEMPT.has(pkg.name)) {
    const ready = conventions === 'yes' && stableDeps === 'yes' ? 'yes' : 'no'
    return {
      package: pkg.name,
      tier,
      conventions,
      stableDeps,
      promotionRfc: 'exempt',
      evidence: 'exempt',
      soak: 'exempt',
      axes: 'exempt',
      ready,
    }
  }

  const promotionRfc = hasAcceptedPromotionRfc(pkg, rfcs) ? 'yes' : 'pending'

  let evidence = 'pending'
  let soak = 'pending'
  let axes = 'pending'

  if (!evidenceMissing && evidenceDoc != null) {
    // Manifest structure + soak window without requiring path existence first.
    const structural = validateStabilityEvidence({
      doc: evidenceDoc,
      packageName: pkg.name,
      today,
      // skip pathExists so axes can be reported separately
    })
    evidence = structural.ok ? 'yes' : 'no'

    // Soak is the date window + qualifying minor lines subset.
    soak = evidenceSoakStatus(evidenceDoc, today)

    // Axes require the seven safe paths to exist as files.
    axes = evidenceAxesStatus(evidenceDoc, pathExists)
  }

  const ready =
    conventions === 'yes' &&
    stableDeps === 'yes' &&
    promotionRfc === 'yes' &&
    evidence === 'yes' &&
    soak === 'yes' &&
    axes === 'yes'
      ? 'yes'
      : 'no'

  return {
    package: pkg.name,
    tier,
    conventions,
    stableDeps,
    promotionRfc,
    evidence,
    soak,
    axes,
    ready,
  }
}

/**
 * Soak column: 90-day window + ≥2 distinct minor lines with releases in range.
 * Returns yes | no | pending (pending when required fields absent).
 */
export function evidenceSoakStatus(doc, today = new Date().toISOString().slice(0, 10)) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return 'pending'
  if (!isUtcCalendarDate(doc.betaSince) || !isUtcCalendarDate(doc.proposedStableDate)) {
    return 'pending'
  }
  if (!isUtcCalendarDate(today)) return 'no'
  if (utcCalendarDaysBetween(doc.proposedStableDate, today) < 0) return 'no'
  if (utcCalendarDaysBetween(doc.betaSince, doc.proposedStableDate) < 90) return 'no'
  if (!Array.isArray(doc.qualifyingMinorReleases) || doc.qualifyingMinorReleases.length < 2) {
    return 'pending'
  }
  const lines = new Set()
  for (const entry of doc.qualifyingMinorReleases) {
    if (!entry || !isSemverLike(entry.version) || !isUtcCalendarDate(entry.date)) return 'no'
    if (
      utcCalendarDaysBetween(doc.betaSince, entry.date) < 0 ||
      utcCalendarDaysBetween(entry.date, doc.proposedStableDate) < 0
    ) {
      return 'no'
    }
    lines.add(majorMinorLine(entry.version))
  }
  return lines.size >= 2 ? 'yes' : 'no'
}

/**
 * Axes column: all seven evidence paths present, safe, and existent.
 */
export function evidenceAxesStatus(doc, pathExists = () => false) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return 'pending'
  const evidence = doc.evidence
  if (evidence === null || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return 'pending'
  }
  for (const key of EVIDENCE_AXIS_KEYS) {
    const path = evidence[key]
    if (typeof path !== 'string' || path.trim().length === 0) return 'pending'
    if (!isSafeRepoRelativePath(path)) return 'no'
    if (typeof pathExists === 'function' && !pathExists(path)) return 'no'
  }
  return 'yes'
}

/**
 * Build scorecard rows for every package, sorted by package name.
 *
 * @param {object} input
 * @param {Array<object>} input.packages
 * @param {Array<{ file: string, text: string }>} [input.rfcs]
 * @param {(pkg: object) =>
 *   | { kind: 'missing' }
 *   | { kind: 'invalid-json', detail?: string }
 *   | { kind: 'ok', doc: unknown }
 * } input.loadEvidence
 * @param {(path: string) => boolean} [input.pathExists]
 * @param {(pkg: object) => boolean} [input.hasConventions]
 * @param {string} [input.today]
 */
export function buildStabilityReadinessScorecard({
  packages,
  rfcs = [],
  loadEvidence,
  pathExists = () => false,
  hasConventions = () => false,
  today,
} = {}) {
  if (!Array.isArray(packages) || typeof loadEvidence !== 'function') {
    throw new Error('buildStabilityReadinessScorecard requires packages[] and loadEvidence()')
  }

  const sorted = [...packages].sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return sorted.map((pkg) => {
    const loaded = loadEvidence(pkg)
    const evidenceMissing = !loaded || loaded.kind === 'missing' || loaded.kind === 'invalid-json'
    const evidenceDoc = loaded?.kind === 'ok' ? loaded.doc : null
    return evaluateStabilityReadinessRow({
      pkg,
      packages,
      rfcs,
      evidenceDoc,
      evidenceMissing,
      pathExists,
      today,
      conventionsPresent: Boolean(hasConventions(pkg)),
    })
  })
}

/**
 * Deterministic Markdown table for the stability-readiness scorecard.
 */
export function formatStabilityReadinessMarkdown(rows) {
  if (!Array.isArray(rows)) throw new Error('formatStabilityReadinessMarkdown requires rows[]')
  const header =
    '| Package | Tier | Conventions | Stable deps | Promotion RFC | Evidence | Soak | Axes | Ready |'
  const sep =
    '|---|---|---|---|---|---|---|---|---|'
  const body = rows.map((row) => {
    return (
      `| ${row.package} | ${row.tier} | ${row.conventions} | ${row.stableDeps} | ` +
      `${row.promotionRfc} | ${row.evidence} | ${row.soak} | ${row.axes} | ${row.ready} |`
    )
  })
  return [header, sep, ...body, ''].join('\n')
}
