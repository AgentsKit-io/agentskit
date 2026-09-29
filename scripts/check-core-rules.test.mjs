import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CORE_RULES } from '../packages/core/src/rules.ts'
import { scanText } from '../packages/cross-platform/src/lint/scan.ts'
import { emptyBaseline, judge, planUpdate, repoRoot, scanCoreFindings } from './check-core-rules.mjs'
import { readFileSync } from 'node:fs'

function finding(file, rule, line = 1) {
  return { file, line, rule, message: 'm', fix: 'f()' }
}

describe('core rule patterns', () => {
  it.each([
    ['no-math-random-id', 'const id = Math.random().toString(36)', 'const id = crypto.randomUUID()'],
    ['no-raw-error-boundary', 'throw new Error("failed")', 'throw new RuntimeError("failed")'],
    ['no-local-canonical-json', 'function canonicalJson(value) { return value }', 'const json = canonicalJson(value)'],
  ])('flags and accepts valid %s examples', (ruleId, bad, good) => {
    const rules = CORE_RULES.filter(rule => rule.id === ruleId)
    expect(scanText('packages/demo/src/a.ts', bad, rules).map(item => item.rule)).toEqual([ruleId])
    expect(scanText('packages/demo/src/a.ts', good, rules)).toEqual([])
  })
})

describe('core rules ratchet', () => {
  it('fails when a count grows and tightens when a count drops', () => {
    const baseline = {
      ...emptyBaseline(),
      entries: { 'packages/demo/src/a.ts': { 'no-math-random-id': 1 } },
    }
    const kept = [finding('packages/demo/src/a.ts', 'no-math-random-id')]
    expect(judge(kept, baseline).regressions).toEqual([])

    const extra = [...kept, finding('packages/demo/src/a.ts', 'no-math-random-id', 2)]
    expect(judge(extra, baseline).regressions).toHaveLength(2)
    const refused = planUpdate(extra, baseline)
    expect(refused.increased).toEqual(['packages/demo/src/a.ts [no-math-random-id]'])
    expect(refused.baseline).toBe(baseline)

    expect(judge([], baseline).improvements).toEqual([
      { file: 'packages/demo/src/a.ts', rule: 'no-math-random-id', allowed: 1, actual: 0 },
    ])
    const lowered = planUpdate([], baseline)
    expect(lowered.increased).toEqual([])
    expect(lowered.baseline.entries).toEqual({})
  })

  it('applies each core rule to package source and honours per-rule ignores', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ak-core-rules-'))
    await mkdir(join(root, 'packages', 'demo', 'src'), { recursive: true })
    await mkdir(join(root, 'packages', 'demo', 'tests'), { recursive: true })
    await writeFile(join(root, 'packages', 'demo', 'src', 'bad.ts'), [
      'const id = Math.random().toString(36)',
      'throw new Error("failed")',
      'function canonicalJson(value) { return value }',
      'const safe = crypto.randomUUID()',
      'throw new RuntimeError("ok")',
      'const encoded = canonicalJson(value)',
    ].join('\n'))
    await writeFile(
      join(root, 'packages', 'demo', 'src', 'owner.ts'),
      'export function canonicalJson(value) { return value } // no-local-canonical-json-ignore: package owner\n',
    )
    await writeFile(join(root, 'packages', 'demo', 'tests', 'bad.ts'), 'const id = Math.random().toString(36)\n')
    const findings = await scanCoreFindings(root)
    expect(findings.map(item => `${item.file}:${item.rule}`).sort()).toEqual([
      'packages/demo/src/bad.ts:no-local-canonical-json',
      'packages/demo/src/bad.ts:no-math-random-id',
      'packages/demo/src/bad.ts:no-raw-error-boundary',
    ])
    await rm(root, { recursive: true, force: true })
  })

  it('matches the committed package-source baseline', async () => {
    const findings = await scanCoreFindings(repoRoot)
    const baseline = JSON.parse(readFileSync(new URL('../.core-rules-baseline.json', import.meta.url), 'utf8'))
    const { regressions, improvements } = judge(findings, baseline)
    expect(regressions).toEqual([])
    expect(improvements).toEqual([])
    expect(findings.some(item => item.file === 'packages/core/src/hash.ts')).toBe(false)
  })
})
