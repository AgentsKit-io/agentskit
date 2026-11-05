import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const KINDS = ['provider', 'ui', 'runtime', 'memory', 'retriever', 'protocol']
export const CAPABILITIES = [
  'streaming', 'tool-calling', 'structured-output', 'multimodal-input', 'cancellation',
  'retries', 'embeddings', 'persistent-memory', 'human-approval',
]
export const STATES = ['verified', 'partial', 'planned', 'unsupported']
const DATE = /^\d{4}-\d{2}-\d{2}$/
const ENTRY_KEYS = ['subject', 'capability', 'state', 'evidence', 'limitations', 'owner', 'reviewedOn', 'expiresOn']

const isString = (v) => typeof v === 'string' && v.length > 0

/** Validate a parsed matrix; returns a list of human-readable problems. */
export function validateMatrix(matrix, { root, today }) {
  const errors = []
  if (!matrix || typeof matrix !== 'object' || matrix.schemaVersion !== 1) return ['schemaVersion must be 1']
  if (!Array.isArray(matrix.entries)) return ['entries must be an array']
  const seen = new Set()
  matrix.entries.forEach((entry, i) => {
    const s = entry?.subject
    const label = `entries[${i}] (${s?.kind}/${s?.id} ${entry?.capability})`
    const fail = (msg) => errors.push(`${label}: ${msg}`)
    for (const key of Object.keys(entry ?? {})) if (!ENTRY_KEYS.includes(key)) fail(`unknown field "${key}"`)
    if (!s || !KINDS.includes(s.kind)) fail(`subject.kind must be one of ${KINDS.join(', ')}`)
    if (!isString(s?.id)) fail('subject.id is required')
    if (!isString(s?.package)) fail('subject.package is required')
    if (!CAPABILITIES.includes(entry?.capability)) fail(`unknown capability "${entry?.capability}"`)
    if (!STATES.includes(entry?.state)) fail(`state must be one of ${STATES.join(', ')}`)
    if (!isString(entry?.owner)) fail('owner is required')
    if (!DATE.test(entry?.reviewedOn ?? '')) fail('reviewedOn must be YYYY-MM-DD')
    if (!DATE.test(entry?.expiresOn ?? '')) fail('expiresOn must be YYYY-MM-DD')
    else if (entry.expiresOn < today) fail(`expired on ${entry.expiresOn}; re-review the evidence`)
    if (DATE.test(entry?.reviewedOn ?? '') && DATE.test(entry?.expiresOn ?? '') && entry.expiresOn <= entry.reviewedOn) {
      fail('expiresOn must be after reviewedOn')
    }
    const key = `${s?.kind}/${s?.id}/${entry?.capability}`
    if (seen.has(key)) fail('duplicate subject+capability')
    seen.add(key)

    const needsEvidence = entry?.state === 'verified' || entry?.state === 'partial'
    if (needsEvidence) {
      const ev = entry.evidence
      if (!ev || !isString(ev.test) || !isString(ev.command)) fail(`${entry.state} requires evidence.test and evidence.command`)
      else {
        if (!/\.(test|spec)\.[cm]?[jt]sx?$/.test(ev.test)) fail(`evidence.test "${ev.test}" is not a test file`)
        else if (!existsSync(join(root, ev.test))) fail(`evidence.test "${ev.test}" does not exist`)
        if (!ev.command.includes(ev.test.replace(/^packages\/[^/]+\//, ''))) fail('evidence.command does not run evidence.test')
      }
      if (entry.state === 'partial' && !isString(entry.limitations)) fail('partial requires limitations')
    } else if (entry?.evidence) {
      fail(`${entry.state} must not carry evidence`)
    }
  })
  return errors
}

export function loadMatrix(root) {
  return JSON.parse(readFileSync(join(root, 'docs/interop/compatibility.json'), 'utf8'))
}

const cell = (text) => String(text ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')

/** Render the reference page from the matrix. */
export function renderPage(matrix) {
  const counts = Object.fromEntries(STATES.map((s) => [s, matrix.entries.filter((e) => e.state === s).length]))
  const lines = [
    '---',
    'title: Compatibility matrix',
    'description: What each AgentsKit adapter, memory backend, retriever, UI binding and protocol supports, with the test that proves it.',
    '---',
    '',
    '{/* Generated from docs/interop/compatibility.json by scripts/check-compatibility-matrix.mjs --write. Do not edit by hand. */}',
    '',
    'Every claim points at a test file that exists in this repository. A capability without a test is `planned` or `unsupported`.',
    'The entry format is [`docs/interop/capability-evidence.schema.json`](https://github.com/AgentsKit-io/agentskit/blob/main/docs/interop/capability-evidence.schema.json) (v1).',
    '',
    '| State | Meaning | Entries |',
    '| --- | --- | --- |',
    `| verified | A test exercises the capability | ${counts.verified} |`,
    `| partial | Tested with the limitations listed | ${counts.partial} |`,
    `| planned | Intended, no test yet | ${counts.planned} |`,
    `| unsupported | Not supported | ${counts.unsupported} |`,
    '',
  ]
  for (const kind of KINDS) {
    const rows = matrix.entries.filter((e) => e.subject.kind === kind)
    if (rows.length === 0) continue
    lines.push(`## ${kind}`, '', '| Subject | Package | Capability | State | Evidence | Limitations | Expires |', '| --- | --- | --- | --- | --- | --- | --- |')
    for (const e of rows) {
      lines.push(`| ${cell(e.subject.id)} | \`${e.subject.package}\` | ${e.capability} | ${e.state} | ${e.evidence ? `\`${cell(e.evidence.test)}\`` : '—'} | ${cell(e.limitations) || '—'} | ${e.expiresOn} |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
