import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export const LAUNCH_PROTOCOL = 'agentskit.ecosystem.launch'
export const LAUNCH_SCHEMA_VERSION = 1

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0

export function parseLaunchPackage(input) {
  if (!isObject(input)) throw new Error('launch package must be an object')
  if (input.schemaVersion !== LAUNCH_SCHEMA_VERSION) throw new Error('launch package schemaVersion must be 1')
  if (input.protocol !== LAUNCH_PROTOCOL) throw new Error(`launch package protocol must be ${LAUNCH_PROTOCOL}`)
  if (!isObject(input.hitl)) throw new Error('launch package requires hitl')
  if (!Array.isArray(input.demos) || input.demos.length < 3) throw new Error('launch package requires at least 3 demos')
  if (!Array.isArray(input.funnel) || input.funnel.length === 0) throw new Error('launch package requires funnel steps')
  if (!Array.isArray(input.metrics) || input.metrics.length === 0) throw new Error('launch package requires metrics')
  if (!Array.isArray(input.starterIssues) || input.starterIssues.length === 0) {
    throw new Error('launch package requires starterIssues')
  }
  for (const demo of input.demos) {
    if (!nonEmpty(demo.id) || !Array.isArray(demo.commands) || demo.commands.length !== 3) {
      throw new Error(`demo ${demo.id ?? '?'} must declare exactly three commands`)
    }
    if (!isObject(demo.verification) || !nonEmpty(demo.verification.type)) {
      throw new Error(`demo ${demo.id} must declare verification.type`)
    }
  }
  for (const issue of input.starterIssues) {
    if (!nonEmpty(issue.setup) || !nonEmpty(issue.test) || !nonEmpty(issue.guide)) {
      throw new Error(`starter issue ${issue.id ?? '?'} must declare setup, test, and guide`)
    }
  }
  return input
}

export function loadJson(root, relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'))
}

export function readReadinessOverall(root, artifactPath, fallback = 'blocked') {
  const absolute = join(root, artifactPath)
  if (!existsSync(absolute)) return fallback
  try {
    const report = JSON.parse(readFileSync(absolute, 'utf8'))
    return typeof report.overall === 'string' ? report.overall : fallback
  } catch {
    return fallback
  }
}

function claimMap(claimsDoc) {
  const map = new Map()
  for (const product of claimsDoc.products ?? []) {
    for (const claim of product.claims ?? []) {
      map.set(`${product.productId}:${claim.id}`, claim)
    }
  }
  return map
}

function verifyDemo(root, demo, claims, manifest) {
  const type = demo.verification.type
  if (type === 'executable') {
    const command = demo.verification.command
    if (!Array.isArray(command) || command.length === 0) {
      return { ok: false, message: `${demo.id}: executable verification needs command argv` }
    }
    const [bin, ...args] = command
    const run = spawnSync(bin, args, { cwd: root, encoding: 'utf8', env: process.env })
    if (run.status !== 0) {
      return { ok: false, message: `${demo.id}: command failed (${run.status}): ${run.stderr || run.stdout}` }
    }
    const expected = demo.verification.expectStdoutIncludes
    if (expected && !run.stdout.includes(expected)) {
      return { ok: false, message: `${demo.id}: stdout missing expected text` }
    }
    return { ok: true, message: `${demo.id}: executable demo passed` }
  }
  if (type === 'claims') {
    const map = claimMap(claims)
    for (const requirement of demo.verification.requireClaims ?? []) {
      const claim = map.get(`${requirement.productId}:${requirement.claimId}`)
      if (!claim) {
        return {
          ok: false,
          message: `${demo.id}: missing claim ${requirement.productId}:${requirement.claimId}`,
        }
      }
      const min = requirement.min ?? 1
      if (typeof claim.value === 'number' && claim.value < min) {
        return {
          ok: false,
          message: `${demo.id}: claim ${requirement.claimId} value ${claim.value} < ${min}`,
        }
      }
    }
    return { ok: true, message: `${demo.id}: claims verification passed` }
  }
  if (type === 'manifest-product') {
    const productId = demo.verification.productId
    const product = (manifest.products ?? []).find((entry) => entry.id === productId)
    if (!product) {
      return { ok: false, message: `${demo.id}: ecosystem product missing: ${productId}` }
    }
    return { ok: true, message: `${demo.id}: product ${productId} is registered` }
  }
  return { ok: false, message: `${demo.id}: unknown verification type ${type}` }
}

function pathExists(root, relativePath) {
  return existsSync(join(root, relativePath))
}

function hasRequiredEntry(root, relativePath) {
  const absolute = join(root, relativePath)
  if (!existsSync(absolute)) return false
  const stats = statSync(absolute)
  if (stats.isDirectory()) return readdirSync(absolute).length > 0
  return stats.isFile()
}

export function auditContributionMatrix(root, matrix, { siblingRoots = {}, checkSiblings = false } = {}) {
  const failures = []
  for (const repository of matrix.repositories) {
    const isLocal = repository.localRoot === '.'
    if (!isLocal && !checkSiblings && !siblingRoots[repository.id]) {
      // Sibling repos are documented expectations; enforce only when explicitly requested
      // or when a sibling root is provided by the caller.
      continue
    }
    const base =
      isLocal
        ? root
        : siblingRoots[repository.id] ?? join(root, '..', repository.repo.split('/')[1] ?? repository.id)
    if (!existsSync(base)) {
      // Sibling not checked out — record as skipped, not failed.
      continue
    }
    for (const required of repository.required) {
      if (!hasRequiredEntry(base, required)) {
        failures.push(`${repository.id}: missing ${required}`)
      }
    }
  }
  return failures
}

export function auditLaunchPackage(root, {
  packagePath = 'docs/ecosystem/launch/launch-package.json',
  claimsPath = 'ecosystem-claims.json',
  manifestPath = 'ecosystem.json',
  runExecutables = true,
} = {}) {
  const failures = []
  const pkg = parseLaunchPackage(loadJson(root, packagePath))
  const claims = loadJson(root, claimsPath)
  const manifest = loadJson(root, manifestPath)
  const matrix = loadJson(root, pkg.contributionMatrix.path)

  if (!pathExists(root, pkg.landing.announcementPath)) {
    failures.push(`missing announcement: ${pkg.landing.announcementPath}`)
  }

  const readinessOverall = readReadinessOverall(
    root,
    pkg.readinessGate.artifact,
    pkg.readinessGate.fallbackWhenMissing ?? 'blocked',
  )
  const readinessReady = readinessOverall === pkg.readinessGate.requiredOverall

  if (pkg.hitl.launchTimingApproved && !readinessReady) {
    failures.push(
      `HITL launchTimingApproved=true is illegal while readiness overall is "${readinessOverall}" (need "${pkg.readinessGate.requiredOverall}")`,
    )
  }
  if (pkg.hitl.publicPackageApproved === true && pkg.hitl.launchTimingApproved === true && !readinessReady) {
    failures.push('public package cannot be fully approved for launch while readiness is blocked')
  }
  if (pkg.hitl.launchTimingApproved && (!pkg.hitl.approvedBy || !pkg.hitl.approvedOn)) {
    failures.push('launchTimingApproved requires approvedBy and approvedOn')
  }

  const map = claimMap(claims)
  for (const demo of pkg.demos) {
    for (const ref of demo.claims ?? []) {
      if (!map.has(`${ref.productId}:${ref.claimId}`)) {
        failures.push(`demo ${demo.id} references missing claim ${ref.productId}:${ref.claimId}`)
      }
    }
    if (runExecutables || demo.verification.type !== 'executable') {
      const result = verifyDemo(root, demo, claims, manifest)
      if (!result.ok) failures.push(result.message)
    }
  }

  for (const issue of pkg.starterIssues) {
    if (!issue.guide.startsWith('/docs/')) {
      failures.push(`starter issue ${issue.id} guide must be a docs path`)
    }
  }

  const matrixFailures = auditContributionMatrix(root, matrix)
  failures.push(...matrixFailures)

  const publicDocs = [
    'apps/docs-next/content/docs/reference/contribute/newcomer-journey.mdx',
    'apps/docs-next/content/docs/reference/contribute/recipe-submission.mdx',
    'apps/docs-next/content/docs/reference/contribute/maintainer-expectations.mdx',
    'apps/docs-next/content/docs/reference/contribute/launch-metrics.mdx',
    'apps/docs-next/app/community/page.tsx',
  ]
  for (const doc of publicDocs) {
    if (!pathExists(root, doc)) failures.push(`missing public surface: ${doc}`)
  }

  return {
    ok: failures.length === 0,
    failures,
    readinessOverall,
    readinessReady,
    launchTimingAllowed: readinessReady && pkg.hitl.launchTimingApproved === true,
    packageStatus: pkg.status,
    hitl: pkg.hitl,
  }
}

export function formatLaunchReport(report) {
  const lines = [
    '# AgentsKit launch package audit',
    '',
    `- Package status: **${report.packageStatus}**`,
    `- Readiness overall: **${report.readinessOverall}**`,
    `- Launch timing allowed: **${report.launchTimingAllowed ? 'yes' : 'no'}**`,
    `- HITL public package approved: **${report.hitl.publicPackageApproved}**`,
    `- HITL launch timing approved: **${report.hitl.launchTimingApproved}**`,
    '',
  ]
  if (report.ok) lines.push('All launch package checks passed.')
  else {
    lines.push('Failures:')
    for (const failure of report.failures) lines.push(`- ${failure}`)
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}
