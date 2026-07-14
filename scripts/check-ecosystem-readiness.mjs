#!/usr/bin/env node
import { resolve } from 'node:path'
import {
  evaluateReadiness,
  formatReadinessReport,
  loadReadinessBundle,
  writeReadinessArtifacts,
} from './lib/ecosystem-readiness.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

const argument = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const root = resolve(argument('--root') ?? REPO_ROOT)
const auditDate = argument('--date') ?? process.env.ECOSYSTEM_READINESS_DATE ?? new Date().toISOString().slice(0, 10)
const writeArtifacts = process.argv.includes('--write') || process.argv.includes('--report')
const { inventory, evidenceByProductId } = loadReadinessBundle(root)
const report = evaluateReadiness({ inventory, evidenceByProductId, auditDate })

if (writeArtifacts) {
  const paths = writeReadinessArtifacts(root, report)
  process.stderr.write(
    `Wrote readiness artifacts:\n- ${paths.json}\n- ${paths.markdown}\n- ${paths.latestJson}\n- ${paths.latestMarkdown}\n`,
  )
}

if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
else process.stdout.write(formatReadinessReport(report))

// Exit 0 only when promotion is allowed (overall ready).
if (!report.promotionAllowed) process.exit(1)
