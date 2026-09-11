/**
 * Publish-manifest helpers.
 *
 * The release publishes through `npm publish` (npm OIDC trusted publishing),
 * and npm does not understand pnpm's `workspace:` protocol: it copies the
 * literal `workspace:*` into the published manifest, which no consumer can
 * install (ERR_PNPM_WORKSPACE_PKG_NOT_FOUND / npm EUNSUPPORTEDPROTOCOL).
 *
 * These pure helpers reproduce the rewrite `pnpm publish` performs so the
 * npm path emits real version ranges. Source manifests keep `workspace:*`;
 * the rewrite is applied only for the duration of the publish.
 */

import { findWorkspaceProtocolInManifest } from './packed-consumers.mjs'

export const DEPENDENCY_FIELDS = Object.freeze([
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
])

const WORKSPACE_PREFIX = 'workspace:'

/**
 * Resolve one `workspace:` range to the range pnpm would publish.
 *   workspace:*       -> 1.2.3
 *   workspace:^       -> ^1.2.3
 *   workspace:~       -> ~1.2.3
 *   workspace:^1.0.0  -> ^1.0.0   (explicit range kept as-is)
 * Alias forms (`workspace:pkg@*`) are rejected: they need a rename that npm
 * cannot express, and nothing in this repo uses them.
 *
 * @param {string} range
 * @param {string} version resolved version of the workspace package
 * @returns {string}
 */
export function resolveWorkspaceRange(range, version) {
  if (typeof range !== 'string' || !range.startsWith(WORKSPACE_PREFIX)) return range
  const spec = range.slice(WORKSPACE_PREFIX.length)
  if (spec.includes('@')) throw new Error(`unsupported workspace alias range: ${range}`)
  if (spec === '*' || spec === '') return version
  if (spec === '^' || spec === '~') return `${spec}${version}`
  return spec
}

/**
 * Return a copy of `manifest` with every `workspace:` range in the dependency
 * fields replaced by a concrete range. Throws when a referenced package is not
 * part of `versionsByName` — publishing such a manifest could never install.
 *
 * @param {Record<string, unknown>} manifest
 * @param {ReadonlyMap<string, string> | Record<string, string>} versionsByName
 * @returns {{ manifest: Record<string, unknown>, rewrites: { field: string, name: string, from: string, to: string }[] }}
 */
export function resolveWorkspaceProtocols(manifest, versionsByName) {
  const versions = versionsByName instanceof Map ? versionsByName : new Map(Object.entries(versionsByName))
  const next = { ...manifest }
  /** @type {{ field: string, name: string, from: string, to: string }[]} */
  const rewrites = []

  for (const field of DEPENDENCY_FIELDS) {
    const block = manifest[field]
    if (!block || typeof block !== 'object' || Array.isArray(block)) continue
    /** @type {Record<string, unknown>} */
    const rewritten = {}
    for (const [name, range] of Object.entries(block)) {
      if (typeof range !== 'string' || !range.startsWith(WORKSPACE_PREFIX)) {
        rewritten[name] = range
        continue
      }
      const version = versions.get(name)
      if (!version) {
        throw new Error(
          `${String(manifest.name)}: ${field}.${name} uses "${range}" but ${name} is not a workspace package`,
        )
      }
      const to = resolveWorkspaceRange(range, version)
      rewritten[name] = to
      rewrites.push({ field, name, from: range, to })
    }
    next[field] = rewritten
  }

  return { manifest: next, rewrites }
}

/**
 * Assert a manifest destined for the registry carries no `workspace:` range.
 * @param {Record<string, unknown>} manifest
 * @param {string} [label]
 */
export function assertNoWorkspaceProtocol(manifest, label = String(manifest?.name ?? 'manifest')) {
  const hits = findWorkspaceProtocolInManifest(manifest)
  if (hits.length === 0) return
  const detail = hits.map(hit => `${hit.path}=${hit.value}`).join(', ')
  throw new Error(`${label}: published manifest still contains workspace: protocol (${detail})`)
}
