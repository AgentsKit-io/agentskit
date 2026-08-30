#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { dirname, join, resolve } from 'node:path'

export const BENCHMARK_SCHEMA_VERSION = 2
export const BENCHMARK_NAME = 'doc-bridge-retrieval-v1'
export const DEFAULT_MAX_REGRESSION = 0.1

const root = process.cwd()
const outputDir = resolve(root, '.doc-bridge', 'benchmarks')
const baselinePath = join(outputDir, 'baseline.json')
const currentPath = join(outputDir, 'current.json')
const localDocBridgeCli = resolve(root, '..', 'doc-bridge', 'bin', 'ak-docs.js')
const installedDocBridgeCli = resolve(root, 'node_modules', '@agentskit', 'doc-bridge', 'bin', 'ak-docs.js')
const docBridgeCli = process.env.DOC_BRIDGE_CLI || (existsSync(localDocBridgeCli) ? localDocBridgeCli : installedDocBridgeCli)
const configPath = process.env.DOC_BRIDGE_CONFIG || 'doc-bridge.config.json'
const queryTasks = [
  ['task-01', 'core'],
  ['task-02', 'mcp'],
  ['task-03', 'memory'],
  ['task-04', 'cli'],
]
const measurementsPerTask = 3
const retrievalBatches = 3

const metricRules = [
  ['retrieval.hitRate', 'minimum'],
  ['retrieval.latencyP95Ms', 'maximum'],
  ['retrieval.responseBytesP95', 'maximum'],
  ['retrieval.estimatedTokensP95', 'maximum'],
  ['quality.evidenceCoverage', 'minimum'],
  ['quality.documentationCoverage', 'minimum'],
  ['quality.documentCoverage', 'minimum'],
  ['quality.agentDocumentCoverage', 'minimum'],
  ['quality.staleCount', 'maximum'],
  ['quality.undocumentedCount', 'maximum'],
  ['quality.unresolvedCount', 'maximum'],
  ['quality.notAnalyzedCount', 'maximum'],
]

function percentile(values, percentileValue) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)]
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function latestWorkflowValue(stage) {
  const manifest = readJson(join(root, '.doc-bridge', 'workflow', 'manifest.json'))
  const step = manifest.steps?.find((candidate) => candidate.name === stage)
  const artifact = step?.artifactRefs?.find((reference) => reference.startsWith('artifacts/'))
  if (!artifact) throw new Error(`missing ${stage} workflow artifact`)
  return readJson(join(root, '.doc-bridge', 'workflow', artifact)).value
}

function byteSize(filePath) {
  return statSync(filePath).size
}

function countDocumentationFiles(directory) {
  if (!existsSync(directory)) return 0
  let count = 0
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) count += countDocumentationFiles(entryPath)
    else if (/\.(md|mdx)$/.test(entry.name)) count += 1
  }
  return count
}

function runQuery(packageId) {
  const started = performance.now()
  const result = spawnSync(process.execPath, [docBridgeCli, 'query', 'package', packageId, '--agent', '--json', '--config', configPath], {
    cwd: root,
    encoding: 'buffer',
    timeout: 60_000,
    maxBuffer: 2 * 1024 * 1024,
  })
  const latencyMs = Math.round((performance.now() - started) * 100) / 100
  const stdout = result.stdout ?? Buffer.alloc(0)
  let payload = null
  try {
    payload = JSON.parse(stdout.toString('utf8'))
  } catch {
    // Record only aggregate failure data; never persist query output.
  }
  const hit = result.status === 0 && payload?.type === 'agent-handoff' && typeof payload.startHere === 'string' && Array.isArray(payload.checks)
  return { hit, latencyMs, responseBytes: stdout.byteLength }
}

function measureTask(id, packageId) {
  const samples = Array.from({ length: measurementsPerTask }, () => runQuery(packageId))
  return {
    id,
    samples,
    hit: samples.every((sample) => sample.hit),
    latencyMs: percentile(samples.map((sample) => sample.latencyMs), 0.5),
    responseBytes: percentile(samples.map((sample) => sample.responseBytes), 0.5),
  }
}

export function collectMetrics() {
  const batches = Array.from({ length: retrievalBatches }, () => queryTasks.map(([id, packageId]) => measureTask(id, packageId)))
  const results = batches.at(-1) ?? []
  const latencies = batches.flatMap((batch) => batch.flatMap((result) => result.samples.map((sample) => sample.latencyMs)))
  const responseBytes = batches.flatMap((batch) => batch.flatMap((result) => result.samples.map((sample) => sample.responseBytes)))
  const batchLatencyP95s = batches.map((batch) => percentile(batch.flatMap((result) => result.samples.map((sample) => sample.latencyMs)), 0.95))
  const indexPath = join(root, '.doc-bridge', 'index.json')
  const llmsPath = join(root, '.doc-bridge', 'llms.txt')
  const reportPath = join(root, '.doc-bridge', 'report.html')
  const index = readJson(indexPath)
  const reconciliation = latestWorkflowValue('reconcile')
  const coverage = latestWorkflowValue('normalize').coverage ?? []
  const corpusBytes = byteSize(indexPath) + byteSize(llmsPath)
  const responseBytesP95 = percentile(responseBytes, 0.95)
  const diagnostics = reconciliation.diagnostics ?? []
  const diagnosticsByStatus = reconciliation.summary?.diagnosticsByStatus ?? {}
  const documentation = reconciliation.summary?.documentation
  const packageCount = documentation?.packageCount ?? 0
  const documentedPackageCount = (documentation?.packageStatus?.fresh ?? 0)
    + (documentation?.packageStatus?.stale ?? 0)
    + (documentation?.packageStatus?.missing ?? 0)
    + (documentation?.packageStatus?.unverified ?? 0)

  return {
    artifact: {
      knowledgeEntries: Array.isArray(index.knowledge) ? index.knowledge.length : 0,
      indexBytes: byteSize(indexPath),
      llmsBytes: byteSize(llmsPath),
      agentDocFiles: countDocumentationFiles(join(root, 'apps', 'docs-next', 'content', 'docs', 'for-agents')),
      reportBytes: byteSize(reportPath),
    },
    retrieval: {
      taskCount: results.length,
      measurementsPerTask,
      retrievalBatches,
      hits: results.filter((result) => result.hit).length,
      failedTaskCount: results.filter((result) => !result.hit).length,
      hitRate: results.length === 0 ? 0 : results.filter((result) => result.hit).length / results.length,
      latencyP50Ms: percentile(latencies, 0.5),
      latencyP95Ms: percentile(batchLatencyP95s, 0.5),
      responseBytesP50: percentile(responseBytes, 0.5),
      responseBytesP95,
      estimatedTokensP50: Math.ceil(percentile(responseBytes, 0.5) / 4),
      estimatedTokensP95: Math.ceil(responseBytesP95 / 4),
      corpusBytes,
      contextReduction: corpusBytes === 0 ? 0 : Math.max(0, 1 - responseBytesP95 / corpusBytes),
    },
    quality: {
      entityCount: reconciliation.summary?.entityCount ?? 0,
      comparedRelationCount: reconciliation.summary?.relationCount ?? 0,
      diagnosticCount: reconciliation.summary?.diagnosticCount ?? 0,
      confirmedCount: diagnosticsByStatus.confirmed ?? 0,
      staleCount: diagnosticsByStatus['stale-or-unverified'] ?? 0,
      undocumentedCount: diagnosticsByStatus.undocumented ?? 0,
      unresolvedCount: diagnosticsByStatus.unresolved ?? 0,
      notAnalyzedCount: diagnosticsByStatus['not-analyzed'] ?? 0,
      evidenceBackedDiagnosticCount: diagnostics.filter((diagnostic) => Array.isArray(diagnostic.evidence) && diagnostic.evidence.length > 0).length,
      evidenceCoverage: diagnostics.length === 0 ? 1 : diagnostics.filter((diagnostic) => Array.isArray(diagnostic.evidence) && diagnostic.evidence.length > 0).length / diagnostics.length,
      documentationCoverage: packageCount === 0 ? 1 : documentedPackageCount / packageCount,
      documentCount: documentation?.documentCount ?? 0,
      documentedDocumentCount: documentation?.documentedDocumentCount ?? 0,
      documentCoverage: (documentation?.documentCount ?? 0) === 0 ? 1 : (documentation?.documentedDocumentCount ?? 0) / documentation.documentCount,
      agentDocumentCount: documentation?.documentClassificationCounts?.agent ?? 0,
      documentedAgentDocumentCount: documentation?.documentedDocumentClassificationCounts?.agent ?? 0,
      agentDocumentCoverage: (documentation?.documentClassificationCounts?.agent ?? 0) === 0
        ? 1
        : (documentation?.documentedDocumentClassificationCounts?.agent ?? 0) / documentation.documentClassificationCounts.agent,
      coverageScopeCount: coverage.length,
      completeCoverageScopeCount: coverage.filter((entry) => entry.status === 'complete').length,
      partialCoverageScopeCount: coverage.filter((entry) => entry.status === 'partial').length,
      notAnalyzedCoverageScopeCount: coverage.filter((entry) => entry.status === 'not-analyzed').length,
      packageFreshCount: documentation?.packageStatus?.fresh ?? 0,
      packageStaleCount: documentation?.packageStatus?.stale ?? 0,
      packageMissingCount: documentation?.packageStatus?.missing ?? 0,
      packageUnverifiedCount: documentation?.packageStatus?.unverified ?? 0,
    },
  }
}

function getMetric(metrics, path) {
  return path.split('.').reduce((value, key) => value?.[key], metrics)
}

export function compareMetrics(currentMetrics, baselineMetrics, maxRegression = DEFAULT_MAX_REGRESSION) {
  const regressions = []
  const deltas = {}
  for (const [path, rule] of metricRules) {
    const current = getMetric(currentMetrics, path)
    const baseline = getMetric(baselineMetrics, path)
    if (typeof current !== 'number' || typeof baseline !== 'number') {
      regressions.push({ metric: path, reason: 'missing numeric metric' })
      continue
    }
    deltas[path] = Math.round((current - baseline) * 10000) / 10000
    if (rule === 'minimum' && current < baseline) regressions.push({ metric: path, baseline, current, limit: baseline })
    if (rule === 'maximum') {
      const limit = baseline === 0 ? 0 : baseline * (1 + maxRegression)
      if (current > limit) regressions.push({ metric: path, baseline, current, limit })
    }
  }
  return { passed: regressions.length === 0, regressions, deltas }
}

export function sanitizeBaseline(snapshot) {
  return {
    schemaVersion: BENCHMARK_SCHEMA_VERSION,
    benchmark: BENCHMARK_NAME,
    metrics: snapshot.metrics,
    thresholds: snapshot.thresholds,
  }
}

function atomicWrite(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`)
    renameSync(temporaryPath, filePath)
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath)
  }
}

function makeSnapshot(metrics, comparison = null) {
  return {
    schemaVersion: BENCHMARK_SCHEMA_VERSION,
    benchmark: BENCHMARK_NAME,
    runId: `${Date.now()}-${process.pid}`,
    metrics,
    thresholds: { maxRegression: DEFAULT_MAX_REGRESSION, minHitRate: 1, tokenEstimate: 'responseBytes / 4' },
    comparison,
  }
}

function main(argv) {
  const writeBaseline = argv.includes('--write-baseline')
  const replaceBaseline = argv.includes('--replace-baseline')
  const check = argv.includes('--check')
  const json = argv.includes('--json')
  if (replaceBaseline && !writeBaseline) throw new Error('--replace-baseline requires --write-baseline')
  if (writeBaseline && existsSync(baselinePath) && !replaceBaseline) throw new Error('baseline exists; use --replace-baseline only after an explicit review')

  const metrics = collectMetrics()
  const baseline = existsSync(baselinePath) ? readJson(baselinePath) : null
  const comparison = baseline ? compareMetrics(metrics, baseline.metrics, baseline.thresholds?.maxRegression ?? DEFAULT_MAX_REGRESSION) : null
  const snapshot = makeSnapshot(metrics, comparison)
  if (!check) atomicWrite(currentPath, snapshot)
  if (writeBaseline) atomicWrite(baselinePath, sanitizeBaseline(snapshot))

  let status = 'passed'
  if (check && (!baseline || !comparison?.passed)) status = 'failed'
  const output = { ...snapshot, status, baselinePresent: Boolean(baseline || writeBaseline) }
  if (json || check || writeBaseline) console.log(JSON.stringify(output, null, 2))
  else console.log(`Doc Bridge benchmark ${status}: ${metrics.retrieval.hits}/${metrics.retrieval.taskCount} retrieval tasks hit`)
  return status === 'passed' ? 0 : 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = main(process.argv.slice(2))
  } catch (error) {
    console.error(`Doc Bridge benchmark failed: ${error.message}`)
    process.exitCode = 1
  }
}
