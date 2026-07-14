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
const { inventory, evidenceByProductId } = loadReadinessBundle(root)
const report = evaluateReadiness({ inventory, evidenceByProductId, auditDate })
const paths = writeReadinessArtifacts(root, report)

process.stdout.write(formatReadinessReport(report))
process.stderr.write(
  `Archived readiness report:\n- ${paths.json}\n- ${paths.markdown}\n- ${paths.latestJson}\n- ${paths.latestMarkdown}\n`,
)

// Reporting always succeeds as a process so CI can archive blocked states.
// Promotion remains gated by check:ecosystem-readiness.
