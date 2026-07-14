#!/usr/bin/env node
import { resolve } from 'node:path'
import { auditExternalContributions, formatExternalReport } from './lib/external-contributions.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

const argument = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const root = resolve(argument('--root') ?? REPO_ROOT)
const report = auditExternalContributions(root)

if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
else process.stdout.write(formatExternalReport(report))

if (!report.ok) process.exit(1)
