#!/usr/bin/env node
/**
 * Generates lib/ecosystem-stats.snapshot.json — the committed fallback used when
 * a sibling property's /api/stats.json is unreachable during build, and the
 * value consumed by client components (which can't run the fs derivation).
 *
 * Runs the same derivation as the live route via tsx so the snapshot can never
 * drift from compute-stats.ts. Wire into prebuild.
 *
 *   node scripts/gen-stats-snapshot.mjs
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = join(here, '..')
const out = join(appRoot, 'lib', 'ecosystem-stats.snapshot.json')

// Evaluate compute-stats.ts in-process via tsx and print JSON.
const code = `import('${join(appRoot, 'lib', 'compute-stats.ts').replace(/\\/g, '/')}').then(m => { process.stdout.write(JSON.stringify(m.computeStats())) })`
const json = execFileSync('npx', ['tsx', '-e', code], { cwd: appRoot, encoding: 'utf8' })

const stats = JSON.parse(json)
writeFileSync(out, JSON.stringify(stats, null, 2) + '\n')
console.log('ecosystem-stats snapshot written:', stats.counts)
