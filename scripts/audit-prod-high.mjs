#!/usr/bin/env node
/**
 * Production dependency security audit using npm's Bulk Advisory API.
 *
 * Why this exists: as of 2026-07-15 the legacy registry endpoints used by
 * `pnpm audit` on the 10.x line
 * (`/-/npm/v1/security/audits` and `.../audits/quick`) return HTTP 410.
 * The supported replacement is `/-/npm/v1/security/advisories/bulk`
 * (see https://api-docs.npmjs.com/#tag/Audit).
 *
 * Gate contract (unchanged): fail the process when any advisory of severity
 * `high` or `critical` affects the production dependency graph.
 * Do not ignore advisories, lower the level, or soft-fail registry errors.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const BULK_URL = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk'
const FAIL_SEVERITIES = new Set(['high', 'critical'])

const require = createRequire(import.meta.url)

function listProductionDependencies() {
  // Use the workspace package manager for lockfile-consistent resolution.
  const result = spawnSync(
    'pnpm',
    ['list', '-r', '--prod', '--json', '--depth', 'Infinity'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || 'pnpm list failed\n')
    process.exit(result.status ?? 1)
  }
  const parsed = JSON.parse(result.stdout || '[]')
  const projects = Array.isArray(parsed) ? parsed : [parsed]
  const versionsByName = new Map()

  const walk = (deps) => {
    if (!deps || typeof deps !== 'object') return
    for (const [name, info] of Object.entries(deps)) {
      if (!info || typeof info !== 'object') continue
      const version = info.version
      if (typeof version !== 'string' || version.length === 0) continue
      if (version.startsWith('link:') || version.startsWith('workspace:')) {
        walk(info.dependencies)
        continue
      }
      if (!versionsByName.has(name)) versionsByName.set(name, new Set())
      versionsByName.get(name).add(version)
      walk(info.dependencies)
    }
  }

  for (const project of projects) walk(project.dependencies)
  return Object.fromEntries(
    [...versionsByName.entries()].map(([name, versions]) => [name, [...versions].sort()]),
  )
}

function versionInRange(version, range) {
  // Prefer the same semver library pnpm/npm ship with the tree when present.
  try {
    const semver = require('semver')
    return semver.satisfies(version, range, { includePrerelease: true })
  } catch {
    // Fallback: treat exact equality only — better fail closed on parse gaps.
    return range === version || range === `=${version}`
  }
}

async function fetchAdvisories(body) {
  const response = await fetch(BULK_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'agentskit-audit-prod-high',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Bulk advisory endpoint HTTP ${response.status}: ${text.slice(0, 500)}`)
  }
  return response.json()
}

const body = listProductionDependencies()
const packageCount = Object.keys(body).length
if (packageCount === 0) {
  process.stderr.write('audit-prod-high: no production dependencies found\n')
  process.exit(1)
}

let advisoriesByPackage
try {
  advisoriesByPackage = await fetchAdvisories(body)
} catch (error) {
  process.stderr.write(
    `audit-prod-high: registry error (fail closed): ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exit(1)
}

const hits = []
for (const [name, versions] of Object.entries(body)) {
  const advisories = advisoriesByPackage[name]
  if (!Array.isArray(advisories) || advisories.length === 0) continue
  for (const version of versions) {
    for (const advisory of advisories) {
      const severity = String(advisory.severity ?? '').toLowerCase()
      if (!FAIL_SEVERITIES.has(severity)) continue
      const range = advisory.vulnerable_versions ?? advisory.vulnerableVersionRange
      if (typeof range !== 'string' || !versionInRange(version, range)) continue
      hits.push({
        name,
        version,
        severity,
        title: advisory.title ?? 'unknown',
        url: advisory.url ?? '',
        range,
      })
    }
  }
}

if (hits.length > 0) {
  process.stderr.write(
    `audit-prod-high: ${hits.length} high/critical production advisory hit(s) across ${packageCount} packages\n\n`,
  )
  for (const hit of hits) {
    process.stderr.write(
      `  [${hit.severity}] ${hit.name}@${hit.version} (${hit.range}) — ${hit.title}\n` +
        (hit.url ? `    ${hit.url}\n` : ''),
    )
  }
  process.exit(1)
}

process.stdout.write(
  `audit-prod-high: ok — ${packageCount} production packages, 0 high/critical advisories (bulk endpoint)\n`,
)
