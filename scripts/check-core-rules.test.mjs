import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// child-process-import-ignore: integration test executes the built wrapper CLI.
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { CORE_RULES } from '../packages/core/src/rules.ts'
import { scanText } from '../packages/cross-platform/src/lint/scan.ts'
import { runCli } from '../packages/cross-platform/src/lint/cli.ts'
import { compareToBaseline } from '../packages/cross-platform/src/lint/baseline.ts'

const sourceOnly = finding => /^packages\/[^/]+\/src\//.test(finding.file)

describe('CORE rules', () => {
  it.each([
    ['no-math-random-id', 'const id = Math.random().toString(36)', 'const id = crypto.randomUUID()'],
    ['no-raw-error-boundary', 'throw new Error("failed")', 'throw new RuntimeError("failed")'],
    ['no-local-canonical-json', 'function canonicalJson(value) { return value }', 'const json = canonicalJson(value)'],
  ])('flags and accepts valid %s examples', (ruleId, bad, good) => {
    const rule = CORE_RULES.filter(item => item.id === ruleId)
    expect(scanText('packages/demo/src/a.ts', bad, rule).map(item => item.rule)).toEqual([ruleId])
    expect(scanText('packages/demo/src/a.ts', good, rule)).toEqual([])
  })

  it('scans package source, honors per-rule ignores, and applies the shared ratchet', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ak-core-rules-'))
    try {
      const src = join(root, 'packages/demo/src')
      await mkdir(src, { recursive: true })
      await mkdir(join(root, 'packages/demo/tests'), { recursive: true })
      const bad = [
        'const id = Math.random().toString(36)',
        'throw new Error("failed")',
        'function canonicalJson(value) { return value }',
      ].join('\n')
      await writeFile(join(src, 'bad.ts'), bad)
      await writeFile(join(src, 'owner.ts'), 'function canonicalJson(value) { return value } // no-local-canonical-json-ignore: package owner\n')
      await writeFile(join(root, 'packages/demo/tests/bad.ts'), 'const id = Math.random().toString(36)\n')
      const baseline = '.core-baseline.json'
      const lines = []
      const io = { cwd: root, log: line => lines.push(line), error: line => lines.push(line) }
      const options = { rules: CORE_RULES, filter: sourceOnly }
      expect(await runCli(['check', '--init', '--include', 'packages', '--baseline', baseline], io, options)).toBe(0)
      const initial = JSON.parse(await readFile(join(root, baseline), 'utf8'))
      expect(Object.values(initial.entries).flatMap(Object.keys).sort()).toEqual(CORE_RULES.map(rule => rule.id).sort())

      await writeFile(join(src, 'regression.ts'), bad)
      expect(await runCli(['check', '--baseline', baseline], io, options)).toBe(1)
      expect(await runCli(['check', '--update', '--baseline', baseline], io, options)).toBe(1)
      await writeFile(join(src, 'bad.ts'), '')
      await writeFile(join(src, 'regression.ts'), '')
      expect(await runCli(['check', '--update', '--baseline', baseline], io, options)).toBe(0)
      const tightened = JSON.parse(await readFile(join(root, baseline), 'utf8'))
      expect(tightened.entries).toEqual({})
      expect(compareToBaseline([], initial).regressions).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('matches the committed package-source baseline', async () => {
    const root = process.cwd()
    expect(execFileSync(process.execPath, [join(root, 'scripts/check-core-rules.mjs')], {
      cwd: root,
      encoding: 'utf8',
    })).toContain('no new cross-platform issues')
  })
})
