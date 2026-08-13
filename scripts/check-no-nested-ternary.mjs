#!/usr/bin/env node
/**
 * Reject nested conditional expressions in source files changed by a branch.
 * Existing untouched files are outside this focused gate; touched files must be
 * clean before they can be extended further.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { findNestedTernaries } from './lib/no-nested-ternary.mjs'

let base = 'origin/main'
if (process.env.GITHUB_BASE_REF) base = `origin/${process.env.GITHUB_BASE_REF}`
if (process.argv.includes('--base')) base = process.argv[process.argv.indexOf('--base') + 1]

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function changedSourceFiles() {
  const output = git('diff', '--name-only', '--diff-filter=AM', base, '--')
  return output
    .split('\n')
    .filter((file) => /\.(?:ts|tsx|mts|cts|mjs|js)$/.test(file))
    .filter((file) => file.startsWith('packages/') || file.startsWith('scripts/'))
    .filter((file) => existsSync(file))
}

const failures = []
for (const file of changedSourceFiles()) {
  const current = findNestedTernaries(file, readFileSync(file, 'utf8'))
  if (current.length > 0) {
    failures.push({ file, locations: current })
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    const locations = failure.locations.map(({ line, column }) => `${line}:${column}`).join(', ')
    console.error(`nested ternary introduced in ${failure.file} (${locations})`)
  }
  process.exit(1)
}

console.log(`nested ternary gate passed against ${base}`)
