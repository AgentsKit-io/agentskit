import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export const PROTOCOL = 'agentskit.ecosystem.external-contributions'
export const SCHEMA_VERSION = 1

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0

export function loadJson(root, relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'))
}

export function parseProgram(input) {
  if (!isObject(input)) throw new Error('program must be an object')
  if (input.schemaVersion !== SCHEMA_VERSION) throw new Error('program schemaVersion must be 1')
  if (input.protocol !== PROTOCOL) throw new Error(`program protocol must be ${PROTOCOL}`)
  if (!isObject(input.policy)) throw new Error('program requires policy')
  for (const key of [
    'requireTechnicalRelationship',
    'requirePublishedContributionRules',
    'requireUtilityWithoutPromo',
    'requireHumanApprovalBeforeSubmit',
    'forbidMassSubmission',
    'requireMaintenanceOwnerOnAccept',
  ]) {
    if (input.policy[key] !== true) throw new Error(`policy.${key} must be true`)
  }
  return input
}

export function loadTargets(root, path = 'docs/ecosystem/external-contributions/targets/index.json') {
  const doc = loadJson(root, path)
  if (!Array.isArray(doc.targets) || doc.targets.length === 0) throw new Error('targets list is empty')
  return doc.targets
}

export function loadContributions(root, dir = 'docs/ecosystem/external-contributions/contributions') {
  const absolute = join(root, dir)
  if (!existsSync(absolute)) return []
  return readdirSync(absolute)
    .filter((name) => statSync(join(absolute, name)).isDirectory())
    .map((id) => {
      const base = join(dir, id)
      const proposal = loadJson(root, join(base, 'proposal.json'))
      const approvalPath = join(root, base, 'APPROVAL.json')
      const approval = existsSync(approvalPath)
        ? JSON.parse(readFileSync(approvalPath, 'utf8'))
        : { approved: false }
      return { id, base, proposal, approval }
    })
}

export function selectTargets(targets, { allowPromotional = false } = {}) {
  const selected = []
  const rejected = []
  for (const target of targets) {
    if (!target.technicalRelationship || target.promotionalOnly) {
      rejected.push({ id: target.id, reason: 'no technical relationship / promotional-only' })
      continue
    }
    if (!nonEmpty(target.contributionRulesUrl)) {
      rejected.push({ id: target.id, reason: 'missing published contribution rules' })
      continue
    }
    if (!allowPromotional && target.priority === 'rejected-by-policy') {
      rejected.push({ id: target.id, reason: 'rejected by utility-first policy' })
      continue
    }
    selected.push(target)
  }
  return { selected, rejected }
}

function collectFiles(root, relativePaths) {
  const chunks = []
  for (const relativePath of relativePaths) {
    const absolute = join(root, relativePath)
    if (!existsSync(absolute)) continue
    if (statSync(absolute).isDirectory()) {
      for (const name of readdirSync(absolute)) {
        const child = join(relativePath, name)
        if (statSync(join(root, child)).isFile()) {
          chunks.push({ path: child, content: readFileSync(join(root, child), 'utf8') })
        }
      }
    } else {
      chunks.push({ path: relativePath, content: readFileSync(absolute, 'utf8') })
    }
  }
  return chunks
}

export function utilityWithoutPromo(root, proposal) {
  const markers = proposal.utilityWithoutPromo?.promoMarkers ?? [
    'AgentsKit',
    'agentskit.io',
    '@agentskit',
  ]
  const files = collectFiles(root, proposal.files ?? [])
  if (files.length === 0) {
    return { ok: false, reason: 'no contribution files found' }
  }
  // Utility remains if, after stripping promo markers from docs, code/tests still exist.
  const codeFiles = files.filter((file) => /\.(m?js|ts|tsx)$/.test(file.path))
  if (codeFiles.length === 0) {
    return { ok: false, reason: 'contribution has no code/test files — likely promotional-only' }
  }
  const strippedDocs = files
    .filter((file) => /\.(md|mdx)$/.test(file.path))
    .map((file) => {
      let content = file.content
      for (const marker of markers) {
        content = content.split(marker).join('')
      }
      return content
    })
    .join('\n')
  // Code must not *require* promo markers to function — if code only contains promo URLs, fail.
  const codeBlob = codeFiles.map((file) => file.content).join('\n')
  const onlyPromo =
    markers.some((marker) => codeBlob.includes(marker)) &&
    !/\b(test|assert|fetch|export|function|class)\b/.test(codeBlob)
  if (onlyPromo) {
    return { ok: false, reason: 'code appears promotional without standalone behavior' }
  }
  // After stripping, docs may be empty — that is OK if code remains.
  return {
    ok: true,
    codeFiles: codeFiles.map((file) => file.path),
    strippedDocLength: strippedDocs.trim().length,
  }
}

export function prepareSubmission(contribution) {
  const { proposal, approval } = contribution
  if (proposal.outcome?.state === 'accepted' && !nonEmpty(proposal.maintenanceOwner)) {
    throw new Error(`${proposal.id}: accepted contributions require maintenanceOwner`)
  }
  if (!approval || approval.approved !== true) {
    return {
      status: 'blocked',
      reason: 'Human approval required before external submission',
    }
  }
  if (!nonEmpty(approval.approvedBy) || !nonEmpty(approval.approvedOn)) {
    throw new Error(`${proposal.id}: approval requires approvedBy and approvedOn`)
  }
  return {
    status: 'ready-for-human-submit',
    approvedBy: approval.approvedBy,
    approvedOn: approval.approvedOn,
    // Never auto-open upstream PRs from CI.
    action: 'manual-submit',
  }
}

export function runContributionTests(root, proposal) {
  if (!proposal.tests?.command) {
    return { ok: false, message: 'proposal missing tests.command' }
  }
  const cwd = proposal.tests.cwd ? join(root, proposal.tests.cwd) : root
  const [bin, ...args] = proposal.tests.command
  const run = spawnSync(bin, args, { cwd, encoding: 'utf8', env: process.env })
  if (run.status !== 0) {
    return {
      ok: false,
      message: `tests failed (${run.status}): ${run.stderr || run.stdout}`,
    }
  }
  return { ok: true, message: 'tests passed' }
}

export function reportOutcomes(contributions) {
  const rows = contributions.map(({ proposal }) => ({
    id: proposal.id,
    targetId: proposal.targetId,
    state: proposal.outcome?.state ?? 'pending',
    maintenanceOwner: proposal.maintenanceOwner,
    externalUrl: proposal.outcome?.externalUrl ?? null,
  }))
  const counts = {
    pending: rows.filter((row) => row.state === 'pending').length,
    submitted: rows.filter((row) => row.state === 'submitted').length,
    accepted: rows.filter((row) => row.state === 'accepted').length,
    rejected: rows.filter((row) => row.state === 'rejected').length,
  }
  return {
    counts,
    rows,
    // Explicitly not vanity metrics:
    notTracked: ['impressions', 'raw-link-count', 'unqualified-stars'],
  }
}

export function auditExternalContributions(root) {
  const failures = []
  const program = parseProgram(
    loadJson(root, 'docs/ecosystem/external-contributions/program.json'),
  )
  const targets = loadTargets(root)
  const { selected, rejected } = selectTargets(targets)
  if (selected.length === 0) failures.push('no selectable targets with technical relationship')
  if (!rejected.some((entry) => entry.id === 'awesome-ai-agents')) {
    // ensure promotional list target is classified rejected when present
    const promo = targets.find((target) => target.id === 'awesome-ai-agents')
    if (promo && promo.technicalRelationship) {
      failures.push('promotional list target must not claim technicalRelationship without utility pairing')
    }
  }

  const contributions = loadContributions(root)
  if (contributions.length === 0) failures.push('no contribution packages found')

  // Mass submission guard: more than 5 ready-to-submit without approval is forbidden.
  const approvedCount = contributions.filter((item) => item.approval?.approved === true).length
  if (program.policy.forbidMassSubmission && approvedCount > 5) {
    failures.push('mass submission risk: more than 5 approved packages pending submit')
  }

  for (const contribution of contributions) {
    const { proposal, approval, id } = contribution
    const target = targets.find((entry) => entry.id === proposal.targetId)
    if (!target) {
      failures.push(`${id}: unknown target ${proposal.targetId}`)
      continue
    }
    if (!target.technicalRelationship || target.promotionalOnly) {
      failures.push(`${id}: target ${target.id} fails technical relationship policy`)
    }
    if (!nonEmpty(target.contributionRulesUrl)) {
      failures.push(`${id}: target missing contribution rules URL`)
    }
    if (!existsSync(join(root, contribution.base, 'utility-check.md'))) {
      failures.push(`${id}: missing utility-check.md`)
    }
    if (!existsSync(join(root, contribution.base, 'evidence.md'))) {
      failures.push(`${id}: missing evidence.md`)
    }
    const utility = utilityWithoutPromo(root, proposal)
    if (!utility.ok) failures.push(`${id}: utility-first check failed — ${utility.reason}`)

    const tests = runContributionTests(root, proposal)
    if (!tests.ok) failures.push(`${id}: ${tests.message}`)

    const submission = prepareSubmission(contribution)
    if (approval?.approved === true && submission.status !== 'ready-for-human-submit') {
      failures.push(`${id}: approved package did not become ready-for-human-submit`)
    }
    if (approval?.approved !== true && submission.status !== 'blocked') {
      failures.push(`${id}: unapproved package must be blocked from submit`)
    }
    if (proposal.outcome?.state === 'accepted' && !nonEmpty(proposal.maintenanceOwner)) {
      failures.push(`${id}: accepted outcome requires maintenanceOwner`)
    }
  }

  const outcomes = reportOutcomes(contributions)
  return {
    ok: failures.length === 0,
    failures,
    selectedTargets: selected.map((target) => target.id),
    rejectedTargets: rejected,
    outcomes,
  }
}

export function formatExternalReport(report) {
  const lines = [
    '# External contributions program audit',
    '',
    `- Selectable targets: ${report.selectedTargets.join(', ') || '(none)'}`,
    `- Rejected targets: ${report.rejectedTargets.map((entry) => entry.id).join(', ') || '(none)'}`,
    `- Outcomes: pending=${report.outcomes.counts.pending} submitted=${report.outcomes.counts.submitted} accepted=${report.outcomes.counts.accepted} rejected=${report.outcomes.counts.rejected}`,
    `- Not tracked as success: ${report.outcomes.notTracked.join(', ')}`,
    '',
  ]
  if (report.ok) lines.push('All external contribution program checks passed.')
  else {
    lines.push('Failures:')
    for (const failure of report.failures) lines.push(`- ${failure}`)
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}
