import { ErrorCodes, SkillError } from '@agentskit/core'
import type { SkillDefinition } from '@agentskit/core'
import { cloneSkillDefinition, validateSkillDefinition } from './utils'

/**
 * Skill marketplace primitives. `SkillPackage` wraps a
 * `SkillDefinition` with semver + provenance so a registry can list,
 * filter, and install skills across versions.
 */

export interface SkillPackage {
  /** Semver string — validated by `installSkill`. */
  version: string
  /** Publisher identifier (org, user, npm scope). */
  publisher?: string
  /** ISO timestamp of publication. */
  publishedAt?: string
  /** Free-form tags for discovery. */
  tags?: string[]
  /** The actual skill. */
  skill: SkillDefinition
}

export interface SkillRegistryQuery {
  name?: string
  publisher?: string
  tag?: string
  /** Return only versions matching this semver range. See `matchesRange`. */
  versionRange?: string
}

export interface SkillRegistry {
  publish: (pkg: SkillPackage) => Promise<SkillPackage>
  list: (query?: SkillRegistryQuery) => Promise<SkillPackage[]>
  /** Latest package matching the (name, versionRange). */
  install: (name: string, versionRange?: string) => Promise<SkillPackage | null>
  /** Remove a published package by name + version. */
  unpublish?: (name: string, version: string) => Promise<void>
}

interface ParsedSemver {
  major: number
  minor: number
  patch: number
  /** null = release (no prerelease). */
  prerelease: string[] | null
}

const CORE_NUM = /^(0|[1-9]\d*)$/
const IDENT = /^[0-9A-Za-z-]+$/
const NUMERIC_IDENT = /^\d+$/

function invalidSemver(version: string): never {
  throw new SkillError({
    code: ErrorCodes.AK_SKILL_INVALID,
    message: `invalid semver: "${version}"`,
    hint: 'Use X.Y.Z with optional -<prerelease> and/or +<build>; no leading zeroes or empty idents.',
  })
}

function parseCoreNumber(part: string, version: string): number {
  if (!CORE_NUM.test(part)) invalidSemver(version)
  const n = Number(part)
  if (!Number.isSafeInteger(n)) invalidSemver(version)
  return n
}

function validPreIdent(id: string): boolean {
  return !!id && IDENT.test(id) && (!NUMERIC_IDENT.test(id) || id === '0' || !id.startsWith('0'))
}

function parseSemverFull(version: string): ParsedSemver {
  const plus = version.indexOf('+')
  const coreAndPre = plus === -1 ? version : version.slice(0, plus)
  const build = plus === -1 ? null : version.slice(plus + 1)

  const dash = coreAndPre.indexOf('-')
  const core = dash === -1 ? coreAndPre : coreAndPre.slice(0, dash)
  const pre = dash === -1 ? null : coreAndPre.slice(dash + 1)

  const parts = core.split('.')
  if (parts.length !== 3) invalidSemver(version)
  const [maj, min, pat] = parts as [string, string, string]
  const major = parseCoreNumber(maj, version)
  const minor = parseCoreNumber(min, version)
  const patch = parseCoreNumber(pat, version)

  let prerelease: string[] | null = null
  if (pre !== null) {
    const idents = pre.split('.')
    if (!pre || !idents.every(validPreIdent)) invalidSemver(version)
    prerelease = idents
  }

  if (build !== null) {
    const idents = build.split('.')
    if (!build || !idents.every(id => id.length > 0 && IDENT.test(id))) invalidSemver(version)
  }

  return { major, minor, patch, prerelease }
}

/** Public shape stays a 3-tuple even when prerelease/build present. */
export function parseSemver(version: string): [number, number, number] {
  const p = parseSemverFull(version)
  return [p.major, p.minor, p.patch]
}

function compareIdent(ai: string, bi: string): number {
  const aNum = NUMERIC_IDENT.test(ai)
  const bNum = NUMERIC_IDENT.test(bi)
  if (aNum && bNum) {
    if (ai.length !== bi.length) return ai.length < bi.length ? -1 : 1
    return ai < bi ? -1 : ai > bi ? 1 : 0
  }
  if (aNum !== bNum) return aNum ? -1 : 1
  return ai < bi ? -1 : ai > bi ? 1 : 0
}

function comparePrerelease(a: string[] | null, b: string[] | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i]
    const bi = b[i]
    if (ai === undefined) return -1
    if (bi === undefined) return 1
    const cmp = compareIdent(ai, bi)
    if (cmp !== 0) return cmp
  }
  return 0
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemverFull(a)
  const pb = parseSemverFull(b)
  if (pa.major !== pb.major) return pa.major - pb.major
  if (pa.minor !== pb.minor) return pa.minor - pb.minor
  if (pa.patch !== pb.patch) return pa.patch - pb.patch
  return comparePrerelease(pa.prerelease, pb.prerelease)
}

function sameCore(a: ParsedSemver, b: ParsedSemver): boolean {
  return a.major === b.major && a.minor === b.minor && a.patch === b.patch
}

/** node-semver default: prerelease candidates only match same-core prerelease ranges. */
function prereleaseAllowed(version: ParsedSemver, rangeTarget: ParsedSemver): boolean {
  return version.prerelease === null || (rangeTarget.prerelease !== null && sameCore(version, rangeTarget))
}

/**
 * Minimal range matcher — supports:
 *   "1.2.3"   (exact; build metadata ignored)
 *   "^1.2.3"  (npm-compatible caret)
 *   "~1.2.3"  (same minor)
 *   ">=1.2.3" (min version)
 *   "*"       (any)
 *
 * Prerelease candidates are excluded from ^ / ~ / >= unless the range
 * comparator itself includes a prerelease on the same major.minor.patch.
 */
export function matchesRange(version: string, range: string): boolean {
  if (!range || range === '*') return true
  if (/^\d/.test(range)) {
    const v = parseSemverFull(version)
    const t = parseSemverFull(range)
    return sameCore(v, t) && comparePrerelease(v.prerelease, t.prerelease) === 0
  }

  let parsed: { op: '^' | '~' | '>='; target: string }
  if (range.startsWith('>=')) {
    parsed = { op: '>=', target: range.slice(2).trim() }
  } else if (range.startsWith('^') || range.startsWith('~')) {
    parsed = { op: range[0] as '^' | '~', target: range.slice(1).trim() }
  } else {
    return false
  }

  const { op, target } = parsed
  const t = parseSemverFull(target)
  const v = parseSemverFull(version)
  if (!prereleaseAllowed(v, t) || compareSemver(version, target) < 0) return false
  if (op === '>=') return true
  if (op === '~') return v.major === t.major && v.minor === t.minor
  if (t.major > 0) return v.major === t.major
  if (t.minor > 0) return v.major === 0 && v.minor === t.minor
  return v.major === 0 && v.minor === 0 && v.patch === t.patch
}

function clonePackage(pkg: SkillPackage): SkillPackage {
  return {
    version: pkg.version,
    ...(pkg.publisher !== undefined ? { publisher: pkg.publisher } : {}),
    ...(pkg.publishedAt !== undefined ? { publishedAt: pkg.publishedAt } : {}),
    ...(pkg.tags !== undefined ? { tags: pkg.tags.slice() } : {}),
    skill: cloneSkillDefinition(pkg.skill),
  }
}

/**
 * In-memory skill registry — tests, demos, private marketplaces.
 * Map-based storage is prototype-safe and allows names like "__proto__".
 */
export function createSkillRegistry(initial: SkillPackage[] = []): SkillRegistry {
  const packages = new Map<string, SkillPackage[]>()

  function addPackage(pkg: SkillPackage): SkillPackage {
    parseSemver(pkg.version)
    validateSkillDefinition(pkg.skill)
    const entry = clonePackage({
      version: pkg.version,
      publisher: pkg.publisher,
      publishedAt: pkg.publishedAt ?? new Date().toISOString(),
      tags: pkg.tags,
      skill: pkg.skill,
    })

    const bucket = packages.get(pkg.skill.name) ?? []
    if (bucket.some(p => p.version === pkg.version)) {
      throw new SkillError({
        code: ErrorCodes.AK_SKILL_DUPLICATE,
        message: `already published: ${pkg.skill.name}@${pkg.version}`,
        hint: 'Bump the version or unpublish the existing entry first.',
      })
    }
    bucket.push(entry)
    bucket.sort((a, b) => compareSemver(b.version, a.version))
    packages.set(pkg.skill.name, bucket)
    return clonePackage(entry)
  }

  for (const pkg of initial) addPackage(pkg)

  return {
    async publish(pkg) {
      return addPackage(pkg)
    },
    async list(query) {
      const hits: SkillPackage[] = []
      for (const name of [...packages.keys()].sort((a, b) => a.localeCompare(b))) {
        if (query?.name && query.name !== name) continue
        for (const stored of packages.get(name) ?? []) {
          if (query?.publisher && query.publisher !== stored.publisher) continue
          if (query?.tag && !stored.tags?.includes(query.tag)) continue
          if (query?.versionRange && !matchesRange(stored.version, query.versionRange)) continue
          hits.push(clonePackage(stored))
        }
      }
      return hits
    },
    async install(name, versionRange) {
      const bucket = packages.get(name) ?? []
      const filtered = versionRange
        ? bucket.filter(pkg => matchesRange(pkg.version, versionRange))
        : bucket
      const hit = filtered[0]
      return hit ? clonePackage(hit) : null
    },
    async unpublish(name, version) {
      const bucket = packages.get(name)
      if (!bucket) return
      const next = bucket.filter(pkg => pkg.version !== version)
      if (next.length === 0) packages.delete(name)
      else packages.set(name, next)
    },
  }
}
