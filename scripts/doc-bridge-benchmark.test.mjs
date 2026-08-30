import test from 'node:test'
import assert from 'node:assert/strict'

import { compareMetrics, sanitizeBaseline } from './doc-bridge-benchmark.mjs'

const metrics = {
  retrieval: { hitRate: 1, latencyP95Ms: 100, responseBytesP95: 800, estimatedTokensP95: 200 },
  quality: { evidenceCoverage: 1, documentationCoverage: 1, documentCoverage: 1, agentDocumentCoverage: 1, staleCount: 0, undocumentedCount: 0, unresolvedCount: 0, notAnalyzedCount: 0 },
}

test('benchmark comparison accepts metrics within the configured budget', () => {
  const result = compareMetrics({ retrieval: { ...metrics.retrieval, latencyP95Ms: 110 }, quality: metrics.quality }, metrics)
  assert.equal(result.passed, true)
  assert.deepEqual(result.regressions, [])
})

test('benchmark comparison rejects retrieval regressions', () => {
  const result = compareMetrics({ retrieval: { ...metrics.retrieval, hitRate: 0.75, responseBytesP95: 900 }, quality: metrics.quality }, metrics)
  assert.equal(result.passed, false)
  assert.deepEqual(result.regressions.map((item) => item.metric), ['retrieval.hitRate', 'retrieval.responseBytesP95'])
})

test('baseline output contains aggregate metrics only', () => {
  const baseline = sanitizeBaseline({ metrics, thresholds: { maxRegression: 0.1, minHitRate: 1, tokenEstimate: 'responseBytes / 4' }, runId: 'private-run-id' })
  assert.equal(baseline.runId, undefined)
  assert.equal(JSON.stringify(baseline).includes('private-run-id'), false)
  assert.equal(JSON.stringify(baseline).includes('prompt'), false)
})

test('benchmark comparison catches agent-corpus coverage regressions', () => {
  const result = compareMetrics(
    { retrieval: metrics.retrieval, quality: { ...metrics.quality, agentDocumentCoverage: 0.8 } },
    { retrieval: metrics.retrieval, quality: { ...metrics.quality, agentDocumentCoverage: 1 } },
  )
  assert.equal(result.passed, false)
  assert.deepEqual(result.regressions.map((item) => item.metric), ['quality.agentDocumentCoverage'])
})
