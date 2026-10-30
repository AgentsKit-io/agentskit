#!/usr/bin/env node
/**
 * Validates docs/interop/compatibility.json and keeps the generated reference
 * page in sync. `--check` fails on page drift; `--write` regenerates it.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadMatrix, renderPage, validateMatrix } from './lib/compatibility-matrix.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const page = join(root, 'apps/docs-next/content/docs/reference/compatibility.mdx')
const today = new Date().toISOString().slice(0, 10)

const matrix = loadMatrix(root)
const errors = validateMatrix(matrix, { root, today })
if (errors.length > 0) {
  for (const e of errors) process.stderr.write(`✗ ${e}\n`)
  process.exit(1)
}
const generated = renderPage(matrix)
if (process.argv.includes('--write')) {
  writeFileSync(page, generated)
} else if (process.argv.includes('--check')) {
  let current = ''
  try { current = readFileSync(page, 'utf8') } catch { /* missing page is drift */ }
  if (current !== generated) {
    process.stderr.write('✗ compatibility.mdx is stale; run node scripts/check-compatibility-matrix.mjs --write\n')
    process.exit(1)
  }
}
console.log(`✓ compatibility matrix: ${matrix.entries.length} entries valid`)
