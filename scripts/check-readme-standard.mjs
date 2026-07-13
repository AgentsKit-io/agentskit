#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { auditReadmeStandard, formatReadmeStandardReport } from './lib/readme-standard.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

const argument = name => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}
const root = resolve(argument('--root') ?? REPO_ROOT)
const configPath = resolve(root, argument('--config') ?? 'readme-standard-v1.json')
const config = JSON.parse(readFileSync(configPath, 'utf8'))
const report = auditReadmeStandard(config, {
  root,
  today: argument('--date') ?? process.env.README_STANDARD_DATE,
})

if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
else process.stdout.write(formatReadmeStandardReport(report))

if (report.status !== 'pass') process.exit(1)
