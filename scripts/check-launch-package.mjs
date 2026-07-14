#!/usr/bin/env node
import { resolve } from 'node:path'
import { auditLaunchPackage, formatLaunchReport } from './lib/launch-package.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

const argument = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const root = resolve(argument('--root') ?? REPO_ROOT)
const skipExec = process.argv.includes('--skip-exec')
const report = auditLaunchPackage(root, { runExecutables: !skipExec })

if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
else process.stdout.write(formatLaunchReport(report))

if (!report.ok) process.exit(1)
