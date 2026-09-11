#!/usr/bin/env node
/**
 * Publish the workspace through `changeset publish` using the npm client
 * (npm OIDC trusted publishing), while still emitting installable manifests.
 *
 * Why this exists: changesets picks its publish tool with `preferred-pm`. The
 * release deliberately hides `packageManager` and `pnpm-lock.yaml` so it picks
 * npm, but `npm publish` does not rewrite pnpm's `workspace:` protocol — it
 * ships `"@agentskit/core": "workspace:*"` verbatim and consumers cannot
 * install the package. So, for the duration of the publish, every public
 * `packages/*` manifest has its `workspace:` ranges resolved to the concrete
 * version exactly as `pnpm publish` would do, and every package is packed with
 * the same npm client and its tarball manifest re-checked before anything is
 * sent to the registry. Source manifests are restored afterwards.
 *
 * Usage:
 *   node scripts/publish-with-npm.mjs [changeset publish flags]
 *   node scripts/publish-with-npm.mjs --verify-only   # rewrite + pack + check, never publish
 */

import { spawnSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNoWorkspaceProtocol, resolveWorkspaceProtocols } from './lib/publish-manifests.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const packagesRoot = join(root, 'packages')
const rootManifestPath = join(root, 'package.json')
const lockPath = join(root, 'pnpm-lock.yaml')
const lockBackupPath = `${lockPath}.npm-publish-backup-${process.pid}`
const npmClient = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const args = process.argv.slice(2)
const verifyOnly = args.includes('--verify-only')
const publishArgs = args.filter(argument => argument !== '--verify-only')

/** @returns {Promise<{ dir: string, manifestPath: string, source: string, manifest: Record<string, unknown> }[]>} */
async function loadWorkspacePackages() {
  const packages = []
  for (const entry of await readdir(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifestPath = join(packagesRoot, entry.name, 'package.json')
    let source
    try {
      source = await readFile(manifestPath, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    packages.push({ dir: join(packagesRoot, entry.name), manifestPath, source, manifest: JSON.parse(source) })
  }
  return packages.sort((left, right) => String(left.manifest.name).localeCompare(String(right.manifest.name)))
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: root, env: process.env, stdio: 'inherit', ...options })
  if (result.error) throw result.error
  return result
}

/**
 * Pack `pkg` with the release npm client and return the manifest inside the tarball.
 * @param {{ dir: string, manifest: Record<string, unknown> }} pkg
 * @param {string} destination
 */
function readPackedManifest(pkg, destination) {
  const packed = spawnSync(npmClient, ['pack', '--json', '--pack-destination', destination], {
    cwd: pkg.dir,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (packed.error) throw packed.error
  if (packed.status !== 0) throw new Error(`${pkg.manifest.name}: npm pack exited with ${packed.status}`)
  const [entry] = JSON.parse(packed.stdout)
  const tarball = spawnSync('tar', ['-xOf', join(destination, entry.filename), 'package/package.json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (tarball.error) throw tarball.error
  if (tarball.status !== 0) throw new Error(`${pkg.manifest.name}: could not read package.json from ${entry.filename}`)
  return JSON.parse(tarball.stdout)
}

const packages = await loadWorkspacePackages()
const versionsByName = new Map(packages.map(pkg => [String(pkg.manifest.name), String(pkg.manifest.version)]))
const publicPackages = packages.filter(pkg => pkg.manifest.private !== true)

const rootManifestSource = await readFile(rootManifestPath, 'utf8')
const rootManifest = JSON.parse(rootManifestSource)
delete rootManifest.packageManager

const packDestination = await mkdtemp(join(tmpdir(), 'agentskit-publish-'))
let lockHidden = false

try {
  // 1. Resolve workspace: ranges in every public manifest (in place, restored in finally).
  for (const pkg of publicPackages) {
    const { manifest, rewrites } = resolveWorkspaceProtocols(pkg.manifest, versionsByName)
    if (rewrites.length === 0) continue
    await writeFile(pkg.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    for (const rewrite of rewrites) {
      console.log(`[publish] ${pkg.manifest.name}: ${rewrite.field}.${rewrite.name} ${rewrite.from} -> ${rewrite.to}`)
    }
  }

  // 2. Guard: pack with the release npm client and check the tarball manifest.
  for (const pkg of publicPackages) {
    const packedManifest = readPackedManifest(pkg, packDestination)
    assertNoWorkspaceProtocol(packedManifest, `${pkg.manifest.name}@${pkg.manifest.version}`)
  }
  console.log(`[publish] ${publicPackages.length} packed manifests contain no workspace: protocol`)

  if (verifyOnly) {
    console.log('[publish] --verify-only: skipping changeset publish')
  } else {
    // 3. Publish through npm (hide pnpm markers so changesets picks the npm client).
    await writeFile(rootManifestPath, `${JSON.stringify(rootManifest, null, 2)}\n`)
    await rename(lockPath, lockBackupPath)
    lockHidden = true
    const result = run(process.execPath, [join(root, 'node_modules/@changesets/cli/bin.js'), 'publish', ...publishArgs])
    process.exitCode = result.status ?? 1
  }
} finally {
  for (const pkg of publicPackages) await writeFile(pkg.manifestPath, pkg.source)
  await writeFile(rootManifestPath, rootManifestSource)
  if (lockHidden) await rename(lockBackupPath, lockPath)
  await rm(packDestination, { recursive: true, force: true })
}
