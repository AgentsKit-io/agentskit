import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const READINESS_SCHEMA_VERSION = 1
export const READINESS_PROTOCOL = 'agentskit.ecosystem.readiness'

const STATUSES = new Set(['pass', 'fail', 'blocked', 'skipped', 'excepted'])
const SEVERITIES = new Set(['p0', 'p1', 'p2', 'info'])
const OVERALL = new Set(['ready', 'blocked', 'incomplete'])

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0

export function parseInventory(input) {
  if (!isObject(input)) throw new Error('inventory must be an object')
  if (input.schemaVersion !== READINESS_SCHEMA_VERSION) throw new Error('inventory schemaVersion must be 1')
  if (input.protocol !== READINESS_PROTOCOL) throw new Error(`inventory protocol must be ${READINESS_PROTOCOL}`)
  if (!Array.isArray(input.products) || input.products.length === 0) {
    throw new Error('inventory must declare products')
  }
  if (!Array.isArray(input.requiredGateCategories) || input.requiredGateCategories.length === 0) {
    throw new Error('inventory must declare requiredGateCategories')
  }
  const ids = new Set()
  for (const product of input.products) {
    if (!nonEmpty(product.id) || !nonEmpty(product.repo) || !nonEmpty(product.evidenceFile)) {
      throw new Error('every product needs id, repo, and evidenceFile')
    }
    if (ids.has(product.id)) throw new Error(`duplicate product id: ${product.id}`)
    ids.add(product.id)
  }
  return input
}

export function parseEvidence(input, { productId } = {}) {
  if (!isObject(input)) throw new Error('evidence must be an object')
  if (input.schemaVersion !== READINESS_SCHEMA_VERSION) throw new Error('evidence schemaVersion must be 1')
  if (input.protocol !== READINESS_PROTOCOL) throw new Error(`evidence protocol must be ${READINESS_PROTOCOL}`)
  if (!nonEmpty(input.productId) || !nonEmpty(input.repo) || !nonEmpty(input.auditedOn)) {
    throw new Error('evidence requires productId, repo, and auditedOn')
  }
  if (productId && input.productId !== productId) {
    throw new Error(`evidence productId ${input.productId} does not match expected ${productId}`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.auditedOn)) {
    throw new Error(`evidence auditedOn must be YYYY-MM-DD: ${input.auditedOn}`)
  }
  if (!isObject(input.maturity) || !nonEmpty(input.maturity.declared) || !nonEmpty(input.maturity.source)) {
    throw new Error('evidence.maturity requires declared and source')
  }
  if (!Array.isArray(input.gates) || input.gates.length === 0) {
    throw new Error(`${input.productId} must declare at least one gate`)
  }
  const gateIds = new Set()
  for (const gate of input.gates) {
    if (!nonEmpty(gate.id) || !nonEmpty(gate.category) || !STATUSES.has(gate.status) || !SEVERITIES.has(gate.severity)) {
      throw new Error(`${input.productId} has an invalid gate record`)
    }
    if (gateIds.has(gate.id)) throw new Error(`${input.productId} duplicate gate id: ${gate.id}`)
    gateIds.add(gate.id)
    if (!nonEmpty(gate.summary) || !nonEmpty(gate.owner)) {
      throw new Error(`${input.productId} gate ${gate.id} needs summary and owner`)
    }
    if ((gate.status === 'fail' || gate.status === 'blocked') && !nonEmpty(gate.remediation)) {
      throw new Error(`${input.productId} gate ${gate.id} needs remediation when fail/blocked`)
    }
    if (!Array.isArray(gate.evidence)) {
      throw new Error(`${input.productId} gate ${gate.id} evidence must be an array`)
    }
  }
  return input
}

function categoryCoverage(requiredCategories, gates) {
  const present = new Set(gates.map((gate) => gate.category))
  return requiredCategories.map((category) => ({
    category,
    covered: present.has(category),
  }))
}

function findingFromGate(product, gate) {
  return {
    productId: product.id,
    repo: product.repo,
    gateId: gate.id,
    category: gate.category,
    status: gate.status,
    severity: gate.severity,
    summary: gate.summary,
    owner: gate.owner,
    remediation: gate.remediation ?? null,
    evidence: gate.evidence,
  }
}

export function evaluateReadiness({ inventory, evidenceByProductId, auditDate = new Date().toISOString().slice(0, 10) }) {
  const parsedInventory = parseInventory(inventory)
  const products = []
  const findings = []
  let missingEvidence = 0

  for (const product of parsedInventory.products) {
    const raw = evidenceByProductId[product.id]
    if (!raw) {
      missingEvidence += 1
      findings.push({
        productId: product.id,
        repo: product.repo,
        gateId: 'evidence-present',
        category: 'process',
        status: 'fail',
        severity: 'p0',
        summary: `Missing evidence file for ${product.id}`,
        owner: product.repo,
        remediation: `Commit ecosystem-readiness/evidence/${product.id}.json`,
        evidence: [],
      })
      products.push({
        id: product.id,
        repo: product.repo,
        status: 'incomplete',
        maturity: null,
        categories: categoryCoverage(parsedInventory.requiredGateCategories, []),
        gates: [],
      })
      continue
    }

    let evidence
    try {
      evidence = parseEvidence(raw, { productId: product.id })
    } catch (error) {
      missingEvidence += 1
      findings.push({
        productId: product.id,
        repo: product.repo,
        gateId: 'evidence-valid',
        category: 'process',
        status: 'fail',
        severity: 'p0',
        summary: error instanceof Error ? error.message : String(error),
        owner: product.repo,
        remediation: 'Fix the evidence manifest so it validates against the readiness schema.',
        evidence: [product.evidenceFile],
      })
      products.push({
        id: product.id,
        repo: product.repo,
        status: 'incomplete',
        maturity: null,
        categories: categoryCoverage(parsedInventory.requiredGateCategories, []),
        gates: [],
      })
      continue
    }

    if (product.repo !== evidence.repo) {
      findings.push({
        productId: product.id,
        repo: product.repo,
        gateId: 'evidence-repo',
        category: 'process',
        status: 'fail',
        severity: 'p1',
        summary: `Evidence repo ${evidence.repo} does not match inventory repo ${product.repo}`,
        owner: product.repo,
        remediation: 'Align evidence.repo with ecosystem inventory.',
        evidence: [product.evidenceFile],
      })
    }

    const categories = categoryCoverage(parsedInventory.requiredGateCategories, evidence.gates)
    for (const row of categories) {
      if (!row.covered) {
        findings.push({
          productId: product.id,
          repo: product.repo,
          gateId: `category:${row.category}`,
          category: row.category,
          status: 'fail',
          severity: 'p1',
          summary: `Required gate category missing: ${row.category}`,
          owner: product.repo,
          remediation: `Add at least one gate with category "${row.category}" to ${product.evidenceFile}`,
          evidence: [product.evidenceFile],
        })
      }
    }

    for (const gate of evidence.gates) {
      if (gate.status === 'fail' || gate.status === 'blocked') {
        findings.push(findingFromGate(product, gate))
      }
    }

    const blocking = evidence.gates.some(
      (gate) => (gate.status === 'fail' || gate.status === 'blocked') && (gate.severity === 'p0' || gate.severity === 'p1'),
    )
    const missingCategory = categories.some((row) => !row.covered)
    products.push({
      id: product.id,
      repo: product.repo,
      status: blocking || missingCategory ? 'blocked' : 'ready',
      maturity: evidence.maturity,
      auditedOn: evidence.auditedOn,
      categories,
      gates: evidence.gates,
    })
  }

  const p0p1 = findings.filter((finding) => finding.severity === 'p0' || finding.severity === 'p1')
  let overall = 'ready'
  if (missingEvidence > 0) overall = 'incomplete'
  else if (p0p1.length > 0 || products.some((product) => product.status !== 'ready')) overall = 'blocked'

  if (!OVERALL.has(overall)) throw new Error(`invalid overall status ${overall}`)

  return {
    protocol: READINESS_PROTOCOL,
    schemaVersion: READINESS_SCHEMA_VERSION,
    auditDate,
    overall,
    promotionAllowed: overall === 'ready',
    summary: {
      products: products.length,
      ready: products.filter((product) => product.status === 'ready').length,
      blocked: products.filter((product) => product.status === 'blocked').length,
      incomplete: products.filter((product) => product.status === 'incomplete').length,
      findings: findings.length,
      p0: findings.filter((finding) => finding.severity === 'p0').length,
      p1: findings.filter((finding) => finding.severity === 'p1').length,
    },
    products,
    findings: findings.sort((a, b) => {
      const severityRank = { p0: 0, p1: 1, p2: 2, info: 3 }
      return severityRank[a.severity] - severityRank[b.severity] || a.productId.localeCompare(b.productId) || a.gateId.localeCompare(b.gateId)
    }),
  }
}

export function loadReadinessBundle(root, {
  inventoryPath = 'ecosystem-readiness/inventory.json',
  evidenceDir = 'ecosystem-readiness/evidence',
} = {}) {
  const inventory = parseInventory(JSON.parse(readFileSync(join(root, inventoryPath), 'utf8')))
  const evidenceByProductId = {}
  for (const product of inventory.products) {
    const path = join(root, product.evidenceFile.startsWith('ecosystem-readiness/') ? product.evidenceFile : join(evidenceDir, `${product.id}.json`))
    if (existsSync(path)) {
      evidenceByProductId[product.id] = JSON.parse(readFileSync(path, 'utf8'))
    }
  }
  // Also load any extra evidence files for robustness in fixtures
  const absoluteEvidenceDir = join(root, evidenceDir)
  if (existsSync(absoluteEvidenceDir)) {
    for (const name of readdirSync(absoluteEvidenceDir).filter((file) => file.endsWith('.json'))) {
      const data = JSON.parse(readFileSync(join(absoluteEvidenceDir, name), 'utf8'))
      if (data.productId && !evidenceByProductId[data.productId]) {
        evidenceByProductId[data.productId] = data
      }
    }
  }
  return { inventory, evidenceByProductId }
}

export function formatReadinessReport(report) {
  const lines = [
    `# AgentsKit ecosystem readiness`,
    ``,
    `- Audit date: ${report.auditDate}`,
    `- Overall: **${report.overall}**`,
    `- Promotion allowed: **${report.promotionAllowed ? 'yes' : 'no'}**`,
    `- Products: ${report.summary.ready} ready / ${report.summary.blocked} blocked / ${report.summary.incomplete} incomplete (of ${report.summary.products})`,
    `- Findings: ${report.summary.findings} (P0=${report.summary.p0}, P1=${report.summary.p1})`,
    ``,
    `## Products`,
    ``,
  ]
  for (const product of report.products) {
    lines.push(`### ${product.id} — ${product.status}`)
    lines.push(`- Repo: \`${product.repo}\``)
    if (product.maturity) lines.push(`- Maturity: ${product.maturity.declared} (source: ${product.maturity.source})`)
    if (product.auditedOn) lines.push(`- Audited on: ${product.auditedOn}`)
    lines.push(``)
  }
  lines.push(`## Findings`)
  lines.push(``)
  if (report.findings.length === 0) {
    lines.push(`None.`)
  } else {
    for (const finding of report.findings) {
      lines.push(
        `- **${finding.severity.toUpperCase()}** \`${finding.productId}\` / \`${finding.gateId}\` (${finding.status}): ${finding.summary}`,
      )
      if (finding.remediation) lines.push(`  - Remediation: ${finding.remediation} (owner: ${finding.owner})`)
    }
  }
  lines.push(``)
  lines.push(`Broad promotion remains gated until overall status is \`ready\`.`)
  lines.push(``)
  return `${lines.join('\n')}\n`
}

export function writeReadinessArtifacts(root, report, {
  outDir = 'artifacts/ecosystem-readiness',
} = {}) {
  const absolute = join(root, outDir)
  mkdirSync(absolute, { recursive: true })
  const stamp = report.auditDate
  const jsonName = `readiness-${stamp}.json`
  const mdName = `readiness-${stamp}.md`
  writeFileSync(join(absolute, jsonName), `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(join(absolute, mdName), formatReadinessReport(report))
  writeFileSync(join(absolute, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(join(absolute, 'latest.md'), formatReadinessReport(report))
  return {
    json: join(outDir, jsonName),
    markdown: join(outDir, mdName),
    latestJson: join(outDir, 'latest.json'),
    latestMarkdown: join(outDir, 'latest.md'),
  }
}
