#!/usr/bin/env node
// Fail the build if @agentskit/core grows a `dependencies` block. Core
// is contractually zero-dependency (CLAUDE.md, AGENTS.md, package
// keyword `zero-dependencies`); a runtime dep here would silently
// invalidate the load-time / bundle-size promises every downstream
// package makes.
//
// `devDependencies` and `peerDependencies` are fine — they don't ship.

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(here, '..', 'packages', 'core', 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

const deps = pkg.dependencies ?? {}
const names = Object.keys(deps)
if (names.length > 0) {
  console.error(
    `\n@agentskit/core must remain zero-dependency.\n` +
      `Found dependencies in ${pkgPath}:\n` +
      names.map(n => `  - ${n}@${deps[n]}`).join('\n') +
      `\n\nIf this is intentional, propose an RFC and update this guard.\n`,
  )
  process.exit(1)
}

console.log('core has no runtime dependencies ✓')
