import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'vitest'
import {
  evaluateReadiness,
  formatReadinessReport,
  loadReadinessBundle,
  parseEvidence,
  parseInventory,
  writeReadinessArtifacts,
} from './lib/ecosystem-readiness.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

const baseGate = (overrides = {}) => ({
  id: 'g1',
  category: 'quickstart',
  status: 'pass',
  severity: 'info',
  summary: 'ok',
  owner: 'AgentsKit-io/agentskit',
  evidence: ['x'],
  ...overrides,
})

const required = [
  'quickstart',
  'documentation',
  'seo',
  'accessibility',
  'performance',
  'links',
  'llms',
  'doc-bridge',
  'chat',
  'readme',
  'security',
  'maturity',
]

const fullGates = (status = 'pass', severity = 'info') =>
  required.map((category, index) =>
    baseGate({
      id: category,
      category,
      status,
      severity: status === 'pass' || status === 'skipped' || status === 'excepted' ? 'info' : severity,
      summary: `${category} ${status}`,
      remediation: status === 'fail' || status === 'blocked' ? 'fix it' : undefined,
    }),
  )

test('inventory and evidence parsers reject invalid payloads', () => {
  assert.throws(() => parseInventory({}), /schemaVersion/)
  assert.throws(
    () =>
      parseEvidence({
        schemaVersion: 1,
        protocol: 'agentskit.ecosystem.readiness',
        productId: 'x',
        repo: 'r',
        auditedOn: '2026-07-14',
        maturity: { declared: 'beta', source: 'ecosystem.json' },
        gates: [],
      }),
    /at least one gate/,
  )
})

test('missing required categories and P0 findings block readiness', () => {
  const inventory = {
    schemaVersion: 1,
    protocol: 'agentskit.ecosystem.readiness',
    requiredGateCategories: required,
    products: [{ id: 'agentskit', repo: 'AgentsKit-io/agentskit', evidenceFile: 'ecosystem-readiness/evidence/agentskit.json' }],
  }
  const evidence = {
    schemaVersion: 1,
    protocol: 'agentskit.ecosystem.readiness',
    productId: 'agentskit',
    repo: 'AgentsKit-io/agentskit',
    auditedOn: '2026-07-14',
    maturity: { declared: 'beta', source: 'ecosystem.json' },
    gates: [
      baseGate({ id: 'quickstart', category: 'quickstart' }),
      baseGate({
        id: 'chat',
        category: 'chat',
        status: 'blocked',
        severity: 'p0',
        summary: 'migration open',
        remediation: 'merge PR',
      }),
    ],
  }
  const report = evaluateReadiness({
    inventory,
    evidenceByProductId: { agentskit: evidence },
    auditDate: '2026-07-14',
  })
  assert.equal(report.overall, 'blocked')
  assert.equal(report.promotionAllowed, false)
  assert.ok(report.findings.some((finding) => finding.severity === 'p0'))
  assert.ok(report.findings.some((finding) => finding.gateId.startsWith('category:')))
})

test('complete passing evidence yields ready status', () => {
  const inventory = {
    schemaVersion: 1,
    protocol: 'agentskit.ecosystem.readiness',
    requiredGateCategories: required,
    products: [{ id: 'playbook', repo: 'AgentsKit-io/agents-playbook', evidenceFile: 'x' }],
  }
  const evidence = {
    schemaVersion: 1,
    protocol: 'agentskit.ecosystem.readiness',
    productId: 'playbook',
    repo: 'AgentsKit-io/agents-playbook',
    auditedOn: '2026-07-14',
    maturity: { declared: 'stable', source: 'ecosystem.json' },
    gates: fullGates('pass'),
  }
  const report = evaluateReadiness({
    inventory,
    evidenceByProductId: { playbook: evidence },
    auditDate: '2026-07-14',
  })
  assert.equal(report.overall, 'ready')
  assert.equal(report.promotionAllowed, true)
  assert.equal(report.findings.length, 0)
})

test('missing evidence fails closed as incomplete', () => {
  const inventory = {
    schemaVersion: 1,
    protocol: 'agentskit.ecosystem.readiness',
    requiredGateCategories: required,
    products: [{ id: 'akos', repo: 'AgentsKit-io/agentskit-os', evidenceFile: 'missing.json' }],
  }
  const report = evaluateReadiness({ inventory, evidenceByProductId: {}, auditDate: '2026-07-14' })
  assert.equal(report.overall, 'incomplete')
  assert.equal(report.promotionAllowed, false)
})

test('report serialization is deterministic for a fixed fixture', () => {
  const inventory = {
    schemaVersion: 1,
    protocol: 'agentskit.ecosystem.readiness',
    requiredGateCategories: required,
    products: [{ id: 'doc-bridge', repo: 'AgentsKit-io/doc-bridge', evidenceFile: 'x' }],
  }
  const evidence = {
    schemaVersion: 1,
    protocol: 'agentskit.ecosystem.readiness',
    productId: 'doc-bridge',
    repo: 'AgentsKit-io/doc-bridge',
    auditedOn: '2026-07-14',
    maturity: { declared: 'stable', source: 'ecosystem.json' },
    gates: fullGates('pass'),
  }
  const report = evaluateReadiness({
    inventory,
    evidenceByProductId: { 'doc-bridge': evidence },
    auditDate: '2026-07-14',
  })
  const first = formatReadinessReport(report)
  const second = formatReadinessReport(report)
  assert.equal(first, second)
  assert.match(first, /Overall: \*\*ready\*\*/)
})

test('artifact writer creates latest and stamped reports', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ak-readiness-'))
  const report = evaluateReadiness({
    inventory: {
      schemaVersion: 1,
      protocol: 'agentskit.ecosystem.readiness',
      requiredGateCategories: required,
      products: [{ id: 'playbook', repo: 'AgentsKit-io/agents-playbook', evidenceFile: 'x' }],
    },
    evidenceByProductId: {
      playbook: {
        schemaVersion: 1,
        protocol: 'agentskit.ecosystem.readiness',
        productId: 'playbook',
        repo: 'AgentsKit-io/agents-playbook',
        auditedOn: '2026-07-14',
        maturity: { declared: 'stable', source: 'ecosystem.json' },
        gates: fullGates('pass'),
      },
    },
    auditDate: '2026-07-14',
  })
  const paths = writeReadinessArtifacts(dir, report, { outDir: 'out' })
  assert.ok(readFileSync(join(dir, paths.latestJson), 'utf8').includes('"overall": "ready"'))
  assert.ok(readFileSync(join(dir, paths.latestMarkdown), 'utf8').includes('Promotion allowed'))
})

test('repository inventory and evidence load and evaluate without network', () => {
  const { inventory, evidenceByProductId } = loadReadinessBundle(REPO_ROOT)
  assert.equal(inventory.products.length, 7)
  assert.equal(Object.keys(evidenceByProductId).length, 7)
  const report = evaluateReadiness({
    inventory,
    evidenceByProductId,
    auditDate: '2026-07-14',
  })
  assert.equal(report.overall, 'blocked')
  assert.equal(report.promotionAllowed, false)
  assert.ok(report.findings.some((finding) => finding.productId === 'akos' && finding.severity === 'p0'))
  assert.ok(report.summary.p0 + report.summary.p1 > 0)
})
