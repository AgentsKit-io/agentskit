import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, test } from 'vitest'
import { REPO_ROOT } from './compute-stats.mjs'
import {
  auditReadmeStandard,
  computeReadmeSourceHash,
  formatReadmeStandardReport,
  parseReadmeStandard,
} from './lib/readme-standard.mjs'

const config = JSON.parse(readFileSync(join(REPO_ROOT, 'readme-standard-v1.json'), 'utf8'))
const temporaryRoots = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'agentskit-readme-standard-'))
  temporaryRoots.push(root)
  const paths = new Set([
    config.surfaces[0].path,
    ...config.surfaces[0].freshness.sources,
    ...config.surfaces[0].visuals.map(visual => visual.src),
    ...config.surfaces[0].commands.map(command => command.test),
    ...config.surfaces[0].examples.flatMap(example => [example.fixture, example.test]),
  ])
  for (const path of paths) {
    const destination = join(root, path)
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(join(REPO_ROOT, path), destination)
  }
  const value = structuredClone(config)
  value.surfaces = [value.surfaces[0]]
  return { root, value }
}

function refreshHash(root, value) {
  const surface = value.surfaces[0]
  surface.freshness.sourceHash = computeReadmeSourceHash(root, surface.freshness.sources)
}

function mutateReadme(root, transform) {
  const path = join(root, 'README.md')
  writeFileSync(path, transform(readFileSync(path, 'utf8')))
}

test('the approved contract defines all profiles and explicit budgets', () => {
  const parsed = parseReadmeStandard(config)
  assert.deepEqual(parsed.profiles.map(profile => profile.id), [
    'top-level-repository',
    'public-app',
    'major-package',
    'concise-package',
  ])
  for (const profile of parsed.profiles) {
    assert.equal(profile.budgets.accessibility.maxMissingAlt, 0)
    assert.equal(profile.budgets.darkMode.requireStrategy, true)
    assert.equal(profile.budgets.commandVerification.maxUnverifiedPrimary, 0)
    assert.equal(profile.budgets.freshness.requireSourceHash, true)
  }
})

test('the contract rejects repository path traversal', () => {
  const invalid = structuredClone(config)
  invalid.surfaces[0].freshness.sources[0] = '../private.txt'
  assert.throws(() => parseReadmeStandard(invalid), /freshness sources must stay inside the repository/)
})

test('schema validation rejects incomplete profiles, surfaces, evidence, and exceptions', () => {
  const cases = [
    [value => { value.schemaVersion = 2 }, /schemaVersion/],
    [value => { value.standardId = 'other' }, /standardId/],
    [value => { value.status = 'proposed' }, /must be approved/],
    [value => { delete value.approval.approvedBy }, /approval requires/],
    [value => { value.profiles.pop() }, /all four profiles/],
    [value => { value.profiles[0].id = 'unknown' }, /Unknown README profile/],
    [value => { value.profiles[1].id = value.profiles[0].id }, /Duplicate README profile/],
    [value => { delete value.profiles[0].budgets }, /must define budgets/],
    [value => { delete value.profiles[0].budgets.images }, /image.*budget/],
    [value => { value.profiles[0].budgets.badges.max = -1 }, /badge max/],
    [value => { value.profiles[0].budgets.images.min = 7 }, /image range/],
    [value => { value.profiles[0].budgets.accessibility.maxMissingAlt = 1 }, /zero missing alt/],
    [value => { value.profiles[0].budgets.darkMode.requireStrategy = false }, /dark-mode strategy/],
    [value => { value.profiles[0].budgets.commandVerification.maxUnverifiedPrimary = 1 }, /zero unverified/],
    [value => { value.profiles[0].budgets.freshness.reviewCadenceDays = 0 }, /freshness cadence/],
    [value => { value.profiles[0].budgets.freshness.requireSourceHash = false }, /source hashes/],
    [value => { value.surfaces = [] }, /at least one surface/],
    [value => { value.surfaces[0].profileId = 'unknown' }, /valid profileId/],
    [value => { value.surfaces.push(structuredClone(value.surfaces[0])) }, /Duplicate README surface/],
    [value => { value.surfaces[0].path = '/tmp/README.md' }, /stay inside/],
    [value => { value.surfaces[0].dimensions.promise = [] }, /non-empty promise/],
    [value => { delete value.surfaces[0].visuals }, /declare visuals/],
    [value => { value.surfaces[0].commands = [] }, /at least one command/],
    [value => { value.surfaces[0].commands[1].id = value.surfaces[0].commands[0].id }, /duplicate command IDs/],
    [value => { value.surfaces[0].examples[0].id = '' }, /invalid or duplicate example IDs/],
    [value => { value.surfaces[0].visuals[0].src = '../logo.svg' }, /visual paths/],
    [value => { value.surfaces[0].commands[0].test = '../test.mjs' }, /command test paths/],
    [value => { value.surfaces[0].examples[0].fixture = '../agent.ts' }, /example paths/],
    [value => { delete value.surfaces[0].freshness }, /declare freshness/],
    [value => { value.surfaces[0].freshness.sources = [] }, /freshness sources/],
    [value => { value.surfaces[0].freshness.reviewDueOn = 'tomorrow' }, /YYYY-MM-DD/],
    [value => { value.surfaces[0].exceptions.push({ ruleId: 'visual-exception' }) }, /exception is missing/],
    [value => { value.surfaces[0].exceptions.push({ ruleId: 'visual-exception', reason: 'No diagram adds understanding.', approvedBy: 'owner', trackingUrl: 'http://example.com', reviewOn: '2026-08-01' }) }, /trackingUrl or reviewOn/],
    [value => { value.surfaces[0].exceptions.push({ ruleId: 'imaginary-rule', reason: 'No valid rule exists.', approvedBy: 'owner', trackingUrl: 'https://example.com/ticket', reviewOn: '2026-08-01' }) }, /unknown rule/],
  ]
  for (const [change, expected] of cases) {
    const invalid = structuredClone(config)
    change(invalid)
    assert.throws(() => parseReadmeStandard(invalid), expected)
  }
  assert.throws(() => parseReadmeStandard(null), /must be an object/)
})

test('the AgentsKit top-level README passes its locked profile with evidence', () => {
  const report = auditReadmeStandard(config, { root: REPO_ROOT, today: '2026-07-13' })
  assert.equal(report.status, 'pass')
  assert.equal(report.surfaces[0].profileId, 'top-level-repository')
  assert.equal(report.summary.failed, 0)
  assert.ok(report.surfaces[0].rules.every(rule => rule.evidence.length > 0))
})

test('the marked README example runs without credentials or network', () => {
  const source = readFileSync(join(REPO_ROOT, 'apps/docs-next/fixtures/first-agent/agent.ts'), 'utf8')
  assert.doesNotMatch(source, /process\.env|fetch\(|https?:\/\//)
  const run = spawnSync(
    'pnpm',
    ['--filter', '@agentskit/docs-next', 'exec', 'tsx', 'fixtures/first-agent/agent.ts'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  )
  assert.equal(run.status, 0, run.stderr)
  assert.equal(run.stdout.trim(), 'Agent ready. I received: Plan my first production agent')
})

for (const [dimension, marker] of [
  ['promise', '**The agent toolkit JavaScript actually deserves.**'],
  ['proof', '## Verified proof'],
  ['examples', '## Quick start — your first agent, no key required'],
  ['visuals', '```mermaid'],
  ['maturity', '## Maturity and compatibility'],
  ['compatibility', 'Node.js 20+'],
  ['contribution', '## Contributing'],
  ['metadata', '**Tags:**'],
  ['ecosystem', '## The AgentsKit ecosystem'],
]) {
  test(`missing ${dimension} evidence fails with remediation`, () => {
    const { root, value } = fixture()
    mutateReadme(root, markdown => markdown.replaceAll(marker, 'removed-by-fixture'))
    refreshHash(root, value)
    const report = auditReadmeStandard(value, { root, today: '2026-07-13' })
    const rule = report.surfaces[0].rules.find(item => item.ruleId === dimension)
    assert.equal(rule.status, 'fail')
    assert.match(rule.remediation, new RegExp(dimension))
  })
}

test('badge and image budgets fail independently', () => {
  const { root, value } = fixture()
  mutateReadme(root, markdown => `${markdown}\n${Array.from({ length: 13 }, (_, index) => `![badge ${index}](https://img.shields.io/badge/x${index}-x-blue)`).join('\n')}\n${Array.from({ length: 5 }, (_, index) => `![diagram ${index}](https://example.com/diagram-${index}.png)`).join('\n')}\n`)
  refreshHash(root, value)
  const report = auditReadmeStandard(value, { root, today: '2026-07-13' })
  assert.equal(report.surfaces[0].rules.find(rule => rule.ruleId === 'badge-budget').status, 'fail')
  assert.equal(report.surfaces[0].rules.find(rule => rule.ruleId === 'image-budget').status, 'fail')
})

test('trusted badge hosts must match the complete URL origin', () => {
  const { root, value } = fixture()
  mutateReadme(root, markdown => `${markdown}\n![Host confusion](https://attacker.example/img.shields.io/fake.svg)\n`)
  value.profiles[0].budgets.images.max = 3
  refreshHash(root, value)
  const report = auditReadmeStandard(value, { root, today: '2026-07-13' })
  assert.equal(report.surfaces[0].rules.find(rule => rule.ruleId === 'image-budget').status, 'fail')
})

test('missing alt text and invalid dark-mode declarations fail', () => {
  const { root, value } = fixture()
  mutateReadme(root, markdown => markdown.replace('alt="AgentsKit"', 'alt=""'))
  value.surfaces[0].visuals[0].darkMode = 'automatic'
  refreshHash(root, value)
  const report = auditReadmeStandard(value, { root, today: '2026-07-13' })
  assert.equal(report.surfaces[0].rules.find(rule => rule.ruleId === 'image-accessibility').status, 'fail')
  assert.equal(report.surfaces[0].rules.find(rule => rule.ruleId === 'dark-mode').status, 'fail')
})

test('missing READMEs, zero visuals, undeclared files, and incomplete pairs are actionable', () => {
  const missing = fixture()
  rmSync(join(missing.root, 'README.md'))
  assert.equal(auditReadmeStandard(missing.value, { root: missing.root, today: '2026-07-13' }).surfaces[0].rules[0].ruleId, 'readme-exists')

  const zero = fixture()
  mutateReadme(zero.root, markdown => markdown
    .replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
    .replace(/<img\s+[^>]+>/gi, ''))
  zero.value.surfaces[0].visuals = []
  refreshHash(zero.root, zero.value)
  const zeroReport = auditReadmeStandard(zero.value, { root: zero.root, today: '2026-07-13' })
  assert.equal(zeroReport.surfaces[0].rules.find(rule => rule.ruleId === 'visual-exception').status, 'fail')

  const undeclared = fixture()
  mutateReadme(undeclared.root, markdown => `${markdown}\n<img src="./extra.png" alt="Extra architecture" />\n`)
  refreshHash(undeclared.root, undeclared.value)
  assert.equal(auditReadmeStandard(undeclared.value, { root: undeclared.root, today: '2026-07-13' }).surfaces[0].rules.find(rule => rule.ruleId === 'visual-files').status, 'fail')

  const paired = fixture()
  paired.value.surfaces[0].visuals[0] = {
    ...paired.value.surfaces[0].visuals[0],
    darkMode: 'paired',
    lightSrc: 'apps/docs-next/public/brand/logo-wordmark.svg',
  }
  assert.equal(auditReadmeStandard(paired.value, { root: paired.root, today: '2026-07-13' }).surfaces[0].rules.find(rule => rule.ruleId === 'dark-mode').status, 'fail')
})

test('drifted commands and examples fail even when the freshness hash is renewed', () => {
  const { root, value } = fixture()
  mutateReadme(root, markdown => markdown
    .replace('npm install @agentskit/core @agentskit/runtime tsx', 'npm install imaginary-package')
    .replace("const task = request.messages.at(-1)?.content ?? 'your task'", "const task = 'drifted'"))
  refreshHash(root, value)
  const report = auditReadmeStandard(value, { root, today: '2026-07-13' })
  assert.equal(report.surfaces[0].rules.find(rule => rule.ruleId === 'command-verification').status, 'fail')
  assert.equal(report.surfaces[0].rules.find(rule => rule.ruleId === 'example-verification').status, 'fail')
})

test('source drift and an overdue review both fail freshness', () => {
  const drift = fixture()
  mutateReadme(drift.root, markdown => `${markdown}\nCanonical source changed.\n`)
  const driftReport = auditReadmeStandard(drift.value, { root: drift.root, today: '2026-07-13' })
  assert.equal(driftReport.surfaces[0].rules.find(rule => rule.ruleId === 'freshness').status, 'fail')

  const overdue = fixture()
  const due = new Date(`${overdue.value.surfaces[0].freshness.reviewDueOn}T00:00:00.000Z`)
  due.setUTCDate(due.getUTCDate() + 1)
  const overdueReport = auditReadmeStandard(overdue.value, {
    root: overdue.root,
    today: due.toISOString().slice(0, 10),
  })
  assert.equal(overdueReport.surfaces[0].rules.find(rule => rule.ruleId === 'freshness').status, 'fail')
})

test('complete live exceptions are visible as excepted; invalid or expired exceptions fail', () => {
  const { root, value } = fixture()
  value.profiles[0].budgets.images.min = 5
  value.profiles[0].budgets.images.max = 6
  value.surfaces[0].exceptions.push({
    ruleId: 'image-budget',
    reason: 'The architecture is already explained by Mermaid and the two local assets.',
    approvedBy: 'EmersonBraun',
    trackingUrl: 'https://github.com/AgentsKit-io/agentskit/issues/1203',
    reviewOn: '2026-08-01',
  })
  const report = auditReadmeStandard(value, { root, today: '2026-07-13' })
  assert.equal(report.surfaces[0].rules.find(rule => rule.ruleId === 'image-budget').status, 'excepted')
  assert.equal(report.status, 'pass')

  value.surfaces[0].exceptions[0].reviewOn = '2026-07-12'
  const expired = auditReadmeStandard(value, { root, today: '2026-07-13' })
  assert.equal(expired.surfaces[0].rules.find(rule => rule.ruleId === 'image-budget').status, 'fail')

  delete value.surfaces[0].exceptions[0].approvedBy
  assert.throws(() => parseReadmeStandard(value), /exception is missing: approvedBy/)
})

test('text and JSON CLI output are stable, actionable, and profile-aware', () => {
  const report = auditReadmeStandard(config, { root: REPO_ROOT, today: '2026-07-13' })
  const text = formatReadmeStandardReport(report)
  assert.match(text, /agentskit-root \(top-level-repository\) — PASS/)
  assert.match(text, /command-verification/)

  const env = { ...process.env, README_STANDARD_DATE: '2026-07-13' }
  const first = spawnSync(process.execPath, ['scripts/check-readme-standard.mjs', '--json'], { cwd: REPO_ROOT, env, encoding: 'utf8' })
  const second = spawnSync(process.execPath, ['scripts/check-readme-standard.mjs', '--json'], { cwd: REPO_ROOT, env, encoding: 'utf8' })
  assert.equal(first.status, 0, first.stderr)
  assert.equal(first.stdout, second.stdout)
  assert.equal(JSON.parse(first.stdout).surfaces[0].profileId, 'top-level-repository')
})

test('the CLI exits one and returns remediation for a broken fixture', () => {
  const { root, value } = fixture()
  mutateReadme(root, markdown => markdown.replace('## Verified proof', '## Missing proof'))
  writeFileSync(join(root, 'readme-standard-v1.json'), `${JSON.stringify(value, null, 2)}\n`)
  const run = spawnSync(process.execPath, [
    'scripts/check-readme-standard.mjs',
    '--root', root,
    '--config', 'readme-standard-v1.json',
    '--date', '2026-07-13',
    '--json',
  ], { cwd: REPO_ROOT, encoding: 'utf8' })
  assert.equal(run.status, 1)
  const report = JSON.parse(run.stdout)
  assert.equal(report.status, 'fail')
  assert.match(report.surfaces[0].rules.find(rule => rule.ruleId === 'proof').remediation, /proof evidence/)
})
