import { ErrorCodes, SkillError } from '@agentskit/core'
import type { SkillDefinition } from '@agentskit/core'

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

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[\w.-]+)?$/

export function parseSemver(version: string): [number, number, number] {
  const match = version.match(SEMVER)
  if (!match) {
    throw new SkillError({
      code: ErrorCodes.AK_SKILL_INVALID,
      message: `invalid semver: "${version}"`,
      hint: 'Use the X.Y.Z form, optionally suffixed with -<prerelease>.',
    })
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function compareSemver(a: string, b: string): number {
  const [a1, a2, a3] = parseSemver(a)
  const [b1, b2, b3] = parseSemver(b)
  if (a1 !== b1) return a1 - b1
  if (a2 !== b2) return a2 - b2
  return a3 - b3
}

/**
 * Minimal range matcher — supports:
 *   "1.2.3"   (exact)
 *   "^1.2.3"  (same major)
 *   "~1.2.3"  (same minor)
 *   ">=1.2.3" (min version)
 *   "*"       (any)
 * Enough for a basic marketplace; use `semver` on top if you need
 * full npm-compatible ranges.
 */
export function matchesRange(version: string, range: string): boolean {
  if (!range || range === '*') return true
  if (/^\d/.test(range)) return version === range
  if (range.startsWith('>=')) return compareSemver(version, range.slice(2).trim()) >= 0
  if (range.startsWith('^')) {
    const target = range.slice(1).trim()
    const [tMaj] = parseSemver(target)
    const [vMaj] = parseSemver(version)
    return tMaj === vMaj && compareSemver(version, target) >= 0
  }
  if (range.startsWith('~')) {
    const target = range.slice(1).trim()
    const [tMaj, tMin] = parseSemver(target)
    const [vMaj, vMin] = parseSemver(version)
    return tMaj === vMaj && tMin === vMin && compareSemver(version, target) >= 0
  }
  return false
}

/**
 * In-memory skill registry — tests, demos, private marketplaces.
 * Bring your own for production (Postgres row per package, S3 manifest + CDN, etc.).
 */
export function createSkillRegistry(initial: SkillPackage[] = []): SkillRegistry {
  const packages = new Map<string, SkillPackage[]>()
  for (const pkg of initial) addPackage(pkg)

  function addPackage(pkg: SkillPackage): SkillPackage {
    parseSemver(pkg.version) // validate
    const entry = { ...pkg, publishedAt: pkg.publishedAt ?? new Date().toISOString() }
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
    return entry
  }

  return {
    async publish(pkg) {
      return addPackage(pkg)
    },
    async list(query) {
      const hits: SkillPackage[] = []
      for (const [name, versions] of packages) {
        if (query?.name && query.name !== name) continue
        for (const pkg of versions) {
          if (query?.publisher && query.publisher !== pkg.publisher) continue
          if (query?.tag && !pkg.tags?.includes(query.tag)) continue
          if (query?.versionRange && !matchesRange(pkg.version, query.versionRange)) continue
          hits.push(pkg)
        }
      }
      return hits
    },
    async install(name, versionRange) {
      const bucket = packages.get(name) ?? []
      const filtered = versionRange ? bucket.filter(pkg => matchesRange(pkg.version, versionRange)) : bucket
      return filtered[0] ?? null
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
