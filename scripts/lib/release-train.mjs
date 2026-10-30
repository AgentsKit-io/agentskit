/**
 * Release-train planning: compare the canonical `release-train.json` manifest with the registry
 * and the workspace, and describe coordinated updates. Pure functions; I/O lives in
 * scripts/release-train.mjs. Nothing here merges or publishes.
 */

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/
const RANGE = /^([\^~]?)(\d+\.\d+\.\d+)$/
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies']

export function parseVersion(version) {
  const match = VERSION.exec(version)
  if (!match) throw new Error(`not a stable x.y.z version: ${version}`)
  return match.slice(1).map(Number)
}

export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

/** Returns a list of human-readable problems; empty means the manifest is valid. */
export function validateManifest(manifest) {
  const problems = []
  if (manifest.schemaVersion !== 1) problems.push('schemaVersion must be 1')
  if (manifest.humanControlled !== true) problems.push('humanControlled must be true: merge and publish stay manual')
  const seen = new Set()
  for (const group of manifest.groups ?? []) {
    if (!group.id) problems.push('group without id')
    for (const [name, entry] of Object.entries(group.packages ?? {})) {
      if (seen.has(name)) problems.push(`${name} appears in more than one group`)
      seen.add(name)
      try {
        if (compareVersions(entry.minimum, entry.current) > 0) problems.push(`${name}: minimum ${entry.minimum} is above current ${entry.current}`)
      } catch (error) {
        problems.push(`${name}: ${error.message}`)
      }
    }
  }
  if (seen.size === 0) problems.push('manifest declares no packages')
  return problems
}

/** Packages declared by the workspace with a range that no longer matches the manifest `current`. */
export function findDrift(manifest, workspace) {
  const drift = []
  for (const group of manifest.groups) {
    for (const [name, entry] of Object.entries(group.packages)) {
      for (const { file, json } of workspace) {
        for (const field of DEPENDENCY_FIELDS) {
          const range = json[field]?.[name]
          const match = typeof range === 'string' ? RANGE.exec(range) : null
          if (match && match[2] !== entry.current) drift.push({ name, file, field, range, current: entry.current })
        }
      }
    }
  }
  return drift
}

/** Peer ranges that promise support below the manifest `minimum` (the lowest version we verify). */
export function findPeerViolations(manifest, workspace) {
  const violations = []
  for (const group of manifest.groups) {
    for (const [name, entry] of Object.entries(group.packages)) {
      for (const { file, json } of workspace) {
        const range = json.peerDependencies?.[name]
        const versions = typeof range === 'string' ? (range.match(/\d+\.\d+\.\d+/g) ?? []) : []
        const lowest = versions.sort(compareVersions)[0]
        if (lowest && compareVersions(lowest, entry.minimum) < 0) violations.push({ name, file, range, minimum: entry.minimum })
      }
    }
  }
  return violations
}

/**
 * Coordinated updates: a group is proposed when any member has a newer stable release.
 * `latest` maps package name → latest stable version from the registry.
 */
export function planUpdates(manifest, latest) {
  const updates = []
  for (const group of manifest.groups) {
    const changes = []
    for (const [name, entry] of Object.entries(group.packages)) {
      const next = latest[name]
      if (next && compareVersions(next, entry.current) > 0) changes.push({ name, from: entry.current, to: next })
    }
    if (changes.length > 0) updates.push({ group: group.id, changes })
  }
  return updates
}

/** Returns the manifest with `current` bumped for every planned change. */
export function applyToManifest(manifest, updates) {
  const next = structuredClone(manifest)
  for (const { group, changes } of updates) {
    const target = next.groups.find((item) => item.id === group)
    for (const { name, to } of changes) target.packages[name].current = to
  }
  return next
}

/** Rewrites exact/caret/tilde ranges for planned changes, preserving the range prefix. */
export function applyToPackageJson(json, updates) {
  const next = structuredClone(json)
  const targets = new Map(updates.flatMap(({ changes }) => changes.map((change) => [change.name, change])))
  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(next[field] ?? {})) {
      const change = targets.get(name)
      const match = change && typeof range === 'string' ? RANGE.exec(range) : null
      if (match && match[2] === change.from) next[field][name] = `${match[1]}${change.to}`
    }
  }
  return next
}

/** Pull request body: what moves, the compatibility gates it must pass, and who decides. */
export function renderProposal(updates, manifest) {
  const lines = ['## Release-train update', '', 'Proposed from the canonical `release-train.json` manifest. This PR is a draft: review it, and merge and publish manually.', '']
  for (const { group, changes } of updates) {
    lines.push(`### ${group}`, '', '| Package | From | To | Minimum consumer |', '| --- | --- | --- | --- |')
    const members = manifest.groups.find((item) => item.id === group).packages
    for (const { name, from, to } of changes) lines.push(`| \`${name}\` | ${from} | ${to} | ${members[name].minimum} |`)
    lines.push('')
  }
  lines.push(
    '## Compatibility results',
    '',
    'CI on this PR is the record: current-consumer checks (`pnpm check:packed-consumers`, build, tests), minimum-consumer checks (`pnpm check:release-train`, manifest minimums vs. declared peer ranges, run on every PR), and the production security audit (`node scripts/audit-prod-high.mjs`).',
    '',
    '## Review checklist',
    '',
    '- [ ] Coordinated bump is expected for every package in the group.',
    '- [ ] Compatibility and security checks are green.',
    '- [ ] Generated docs/artifacts in the diff are expected.',
    '- [ ] Release notes (changeset) are accurate. Merge and publish are done by a maintainer.',
  )
  return `${lines.join('\n')}\n`
}

/** Changeset describing the update; empty when nothing moves. */
export function renderChangeset(updates, publicPackages) {
  if (updates.length === 0 || publicPackages.length === 0) return ''
  const moved = updates.flatMap(({ changes }) => changes.map(({ name, to }) => `${name} ${to}`)).join(', ')
  return `---\n${publicPackages.map((name) => `"${name}": patch`).join('\n')}\n---\n\nUpdate coordinated release-train dependencies: ${moved}.\n`
}
