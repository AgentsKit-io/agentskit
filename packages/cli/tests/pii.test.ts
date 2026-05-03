import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { lintTaxonomyFile, renderLintReport } from '../src/pii'

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'pii-lint-'))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

function write(name: string, content: string): string {
  const path = join(tmp, name)
  writeFileSync(path, content)
  return path
}

describe('lintTaxonomyFile', () => {
  it('reports ok=true on a valid taxonomy', () => {
    const path = write(
      'good.json',
      JSON.stringify({ version: '1', rules: [{ name: 'email', pattern: '[a-z]+@[a-z]+' }] }),
    )
    const report = lintTaxonomyFile(path)
    expect(report.result.ok).toBe(true)
    expect(report.ruleCount).toBe(1)
    expect(report.file).toBe(path)
  })

  it('reports invalid JSON as a single root issue', () => {
    const path = write('broken.json', '{ "version": "1", rules: }')
    const report = lintTaxonomyFile(path)
    expect(report.result.ok).toBe(false)
    expect(report.result.issues[0]?.message).toMatch(/invalid JSON/)
  })

  it('reports a missing file with a useful error', () => {
    const report = lintTaxonomyFile(join(tmp, 'nope.json'))
    expect(report.result.ok).toBe(false)
    expect(report.result.issues[0]?.message).toMatch(/cannot read file/)
  })

  it('surfaces every rule-level issue', () => {
    const path = write(
      'bad-rules.json',
      JSON.stringify({
        version: '1',
        rules: [
          { name: 'BAD', pattern: 'x' },
          { name: 'broken', pattern: '[' },
        ],
      }),
    )
    const report = lintTaxonomyFile(path)
    expect(report.result.ok).toBe(false)
    expect(report.result.issues.length).toBeGreaterThanOrEqual(2)
  })
})

describe('renderLintReport', () => {
  it('renders a green tick for a valid report', () => {
    const path = write(
      'ok.json',
      JSON.stringify({ version: '1', rules: [{ name: 'email', pattern: 'x' }] }),
    )
    const out = renderLintReport(lintTaxonomyFile(path))
    expect(out).toMatch(/✓ valid · 1 rule/)
  })

  it('renders one bullet per issue', () => {
    const path = write(
      'bad.json',
      JSON.stringify({ version: '2', rules: 'oops' }),
    )
    const out = renderLintReport(lintTaxonomyFile(path))
    expect(out).toMatch(/✗ \d+ issue/)
    expect(out.split('\n').filter(l => l.includes('•')).length).toBeGreaterThan(0)
  })
})
