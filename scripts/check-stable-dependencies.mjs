#!/usr/bin/env node
/**
 * Stable internal-dependency gate.
 *
 * For every workspace package whose agentskit.stability is `stable`, every
 * direct internal `@agentskit/*` dependency listed in dependencies,
 * optionalDependencies, or peerDependencies must also be `stable`.
 *
 * - devDependencies are ignored (test-only wiring is fine).
 * - External (non-@agentskit) dependencies and peers are permitted.
 * - Core is not special-cased; it passes because it has no runtime deps.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditStableDependencies } from './lib/stability-gates.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const pkgsDir = join(root, 'packages')

const packages = []
for (const dir of readdirSync(pkgsDir)) {
  let pkg
  try {
    pkg = JSON.parse(readFileSync(join(pkgsDir, dir, 'package.json'), 'utf8'))
  } catch {
    continue
  }
  packages.push({
    name: pkg.name,
    stability: pkg.agentskit?.stability,
    dependencies: pkg.dependencies,
    optionalDependencies: pkg.optionalDependencies,
    peerDependencies: pkg.peerDependencies,
    devDependencies: pkg.devDependencies,
  })
}

const errors = auditStableDependencies({ packages })

if (errors.length > 0) {
  console.error(
    '\nStable-dependency check failed:\n' +
      errors.map((e) => `  - ${e}`).join('\n') +
      '\n\nA stable package may only depend on other stable @agentskit/* packages ' +
      'in dependencies/optionalDependencies/peerDependencies.\n' +
      'Promote the dependency first, remove it, or keep it test-only under devDependencies.\n',
  )
  process.exit(1)
}
console.log(`stable internal dependencies consistent across ${packages.filter((p) => p.stability === 'stable').length} stable package(s) ✓`)
