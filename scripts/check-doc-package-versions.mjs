#!/usr/bin/env node
/** Keep canonical package reference pages aligned with package.json versions. */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const packageRoot = join(root, 'packages')
const docsRoot = join(root, 'apps', 'docs-next', 'content', 'docs', 'reference', 'packages')
const versionPattern = /\*\*Version:\*\*\s*`([0-9]+\.[0-9]+\.[0-9]+)`/
const errors = []
let checked = 0

for (const entry of readdirSync(packageRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const packageJsonPath = join(packageRoot, entry.name, 'package.json')
  const docsPath = join(docsRoot, `${entry.name}.mdx`)
  if (!existsSync(packageJsonPath) || !existsSync(docsPath)) continue

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  if (!packageJson.version) continue
  checked += 1
  const match = readFileSync(docsPath, 'utf8').match(versionPattern)
  if (!match) errors.push(`${entry.name}: missing **Version:** line in ${docsPath}`)
  else if (match[1] !== packageJson.version) errors.push(`${entry.name}: docs=${match[1]} package=${packageJson.version}`)
}

if (errors.length > 0) {
  console.error(`doc package versions: ${errors.length} mismatch(es) across ${checked} package page(s)`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log(`doc package versions: ${checked} package page(s) match package.json ✓`)
