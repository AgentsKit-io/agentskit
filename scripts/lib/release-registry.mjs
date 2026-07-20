const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

export function parseSemver(value) {
  const match = SEMVER_PATTERN.exec(value)
  if (!match) throw new Error(`invalid semantic version: ${value}`)
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? [],
  }
}

function comparePrerelease(left, right) {
  if (left.length === 0 || right.length === 0) {
    if (left.length === right.length) return 0
    return left.length === 0 ? 1 : -1
  }

  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    if (left[index] === undefined) return -1
    if (right[index] === undefined) return 1
    if (left[index] === right[index]) continue
    const leftNumeric = /^\d+$/.test(left[index])
    const rightNumeric = /^\d+$/.test(right[index])
    if (leftNumeric && rightNumeric) return Number(left[index]) < Number(right[index]) ? -1 : 1
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1
    return left[index] < right[index] ? -1 : 1
  }
  return 0
}

export function compareSemver(leftValue, rightValue) {
  const left = parseSemver(leftValue)
  const right = parseSemver(rightValue)
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1
  }
  return comparePrerelease(left.prerelease, right.prerelease)
}

export function classifyRegistryVersion({ name, localVersion, metadata }) {
  if (metadata.missing) {
    return { name, localVersion, publishedVersion: null, state: 'new-package' }
  }

  const publishedVersion = metadata.latest
  if (typeof publishedVersion !== 'string') {
    return {
      name,
      localVersion,
      publishedVersion: null,
      state: 'conflict',
      reason: 'registry metadata has no latest dist-tag',
    }
  }

  const versions = new Set(Array.isArray(metadata.versions) ? metadata.versions : [])
  const comparison = compareSemver(localVersion, publishedVersion)
  if (versions.has(localVersion) && comparison === 0) {
    return { name, localVersion, publishedVersion, state: 'published' }
  }
  if (!versions.has(localVersion) && comparison > 0) {
    return { name, localVersion, publishedVersion, state: 'unpublished-ahead' }
  }

  const reason = comparison < 0
    ? 'local manifest is behind the registry latest version'
    : versions.has(localVersion)
      ? 'local version exists but is not the latest dist-tag'
      : 'local version does not advance the registry latest version'
  return { name, localVersion, publishedVersion, state: 'conflict', reason }
}

export function evaluateRegistryState(entries, { hasPendingChangesets, allowRecovery = false }) {
  const groups = {
    published: entries.filter(entry => entry.state === 'published'),
    unpublishedAhead: entries.filter(entry => entry.state === 'unpublished-ahead'),
    newPackages: entries.filter(entry => entry.state === 'new-package'),
    conflicts: entries.filter(entry => entry.state === 'conflict'),
  }
  const diagnostics = groups.conflicts.map(entry =>
    `${entry.name}: ${entry.reason} (local ${entry.localVersion}, registry ${entry.publishedVersion ?? 'missing'})`,
  )
  if (hasPendingChangesets && groups.unpublishedAhead.length > 0 && !allowRecovery) {
    diagnostics.push(
      `pending changesets cannot be stacked on ${groups.unpublishedAhead.length} unpublished local version(s); recover the previous release train first`,
    )
  }
  return { ...groups, diagnostics, ok: diagnostics.length === 0 }
}

export function formatRegistryReport(report, { hasPendingChangesets, allowRecovery = false }) {
  const lines = [
    'Release registry preflight',
    `- published and aligned: ${report.published.length}`,
    `- unpublished local versions: ${report.unpublishedAhead.length}`,
    `- new packages: ${report.newPackages.length}`,
    `- conflicts: ${report.conflicts.length}`,
    `- pending changesets: ${hasPendingChangesets ? 'yes' : 'no'}`,
    `- recovery mode: ${allowRecovery ? 'yes' : 'no'}`,
  ]
  for (const entry of report.unpublishedAhead) {
    lines.push(`  - ${entry.name}: ${entry.publishedVersion} -> ${entry.localVersion}`)
  }
  for (const diagnostic of report.diagnostics) lines.push(`ERROR: ${diagnostic}`)
  lines.push(report.ok ? 'Release registry preflight passed' : 'Release registry preflight failed')
  return `${lines.join('\n')}\n`
}
