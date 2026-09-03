#!/usr/bin/env node

import { readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifestPath = join(root, 'package.json')
const lockPath = join(root, 'pnpm-lock.yaml')
const lockBackupPath = `${lockPath}.npm-publish-backup-${process.pid}`
const manifestSource = await readFile(manifestPath, 'utf8')
const manifest = JSON.parse(manifestSource)

delete manifest.packageManager
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
await rename(lockPath, lockBackupPath)

try {
  const result = spawnSync(
    process.execPath,
    [join(root, 'node_modules/@changesets/cli/bin.js'), 'publish', ...process.argv.slice(2)],
    { cwd: root, env: process.env, stdio: 'inherit' },
  )
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  await writeFile(manifestPath, manifestSource)
  await rename(lockBackupPath, lockPath)
}
