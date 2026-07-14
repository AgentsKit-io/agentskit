#!/usr/bin/env node
import { resolve } from 'node:path'
import { auditContentPipeline } from './lib/content-pipeline/index.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

const argument = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const root = resolve(argument('--root') ?? REPO_ROOT)
const skipExec = process.argv.includes('--skip-exec')
const report = auditContentPipeline(root, { runExecutable: !skipExec })

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} else if (report.ok) {
  process.stdout.write(
    `Content pipeline — PASS (${report.recipeCount} recipe(s); human approval still required to publish)\n`,
  )
} else {
  process.stdout.write('Content pipeline — FAIL\n')
  for (const failure of report.failures) process.stdout.write(`- ${failure}\n`)
}

if (!report.ok) process.exit(1)
