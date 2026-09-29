import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compareToBaseline, type Baseline } from '../../cross-platform/src/lint/baseline'
import { scanRepository, scanText } from '../../cross-platform/src/lint/scan'
import { NET_RULES } from '../src/rules'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

const samples: Record<string, { hit: string; miss: string }> = {
  'net-retry-after': {
    hit: "const wait = headers.get('retry-after')",
    miss: "const wait = parseRetryAfter(response.headers.get('retry-after'))",
  },
  'net-sse-data-prefix': {
    hit: "if (line.startsWith('data: ')) return line.slice(6)",
    miss: 'for await (const event of parseSSE(stream)) yield event',
  },
  'net-sleep-promise': {
    hit: 'return new Promise(resolve => setTimeout(resolve, ms))',
    miss: 'await retry(() => request(), { signal })',
  },
  'net-promise-race-timeout': {
    hit: 'return Promise.race([operation, setTimeout(abort, ms)])',
    miss: 'await withTimeout(work, ms, signal)',
  },
  'net-private-ip-regex': {
    hit: 'const blocked = /^10\\.|192\\.168\\.|172\\.16/',
    miss: 'if (!isPublicAddress(ip)) throw denied',
  },
  'net-unbounded-body': {
    hit: 'const payload = await response.text()',
    miss: 'const payload = await readText(response, { maxBytes })',
  },
}

function ruleIds(text: string): string[] {
  return scanText('sample.ts', text, NET_RULES).map(finding => finding.rule)
}

describe('NET_RULES', () => {
  it('covers the six audit patterns with unique ids', () => {
    expect(NET_RULES.map(rule => rule.id)).toEqual([
      'net-retry-after',
      'net-sse-data-prefix',
      'net-sleep-promise',
      'net-promise-race-timeout',
      'net-private-ip-regex',
      'net-unbounded-body',
    ])
    for (const rule of NET_RULES) expect(rule.fix).toContain('@agentskit/net')
  })

  it('gives actionable sleep and cancellation guidance', () => {
    expect(NET_RULES.find(rule => rule.id === 'net-sleep-promise')?.fix).toBe('retry() from @agentskit/net for retry backoff')
    expect(NET_RULES.find(rule => rule.id === 'net-sleep-promise')?.fix).not.toContain('sleep')
    expect(NET_RULES.find(rule => rule.id === 'net-promise-race-timeout')?.fix).toContain('withTimeout(work(signal), ms)')
    expect(NET_RULES.find(rule => rule.id === 'net-promise-race-timeout')?.fix).toContain('timeoutSignal(ms)')
  })

  it.each(Object.entries(samples))('flags %s and accepts the shared helper', (id, sample) => {
    expect(ruleIds(sample.hit), sample.hit).toContain(id)
    expect(ruleIds(sample.miss), sample.miss).toEqual([])
  })

  it('flags the other spellings of each pattern', () => {
    expect(ruleIds('headers.get("Retry-After")')).toEqual(['net-retry-after'])
    expect(ruleIds("const match = /^data:/.exec(line)")).toEqual(['net-sse-data-prefix'])
    expect(ruleIds('setTimeout(onTimeout, ms); return Promise.race([work, abort])')).toEqual(['net-promise-race-timeout'])
    expect(ruleIds('const linkLocal = /169\\.254/')).toEqual(['net-private-ip-regex'])
    expect(ruleIds('const data = await res.json()')).toEqual(['net-unbounded-body'])
    expect(ruleIds('const bytes = await response.arrayBuffer()')).toEqual(['net-unbounded-body'])
  })

  it('does not flag the canonical multiline sleep or a combined race that is only the race rule', () => {
    const multiline = 'return new Promise((resolve) => {\n  setTimeout(resolve, ms)\n})'
    expect(ruleIds(multiline)).toEqual([])
    const classic = 'await Promise.race([work, new Promise(resolve => setTimeout(resolve, ms))])'
    expect(ruleIds(classic).sort()).toEqual(['net-promise-race-timeout', 'net-sleep-promise'])
  })

  it('reports file, line, message and fix through scanText', () => {
    const [finding] = scanText('pkg/http.ts', `\n${samples['net-unbounded-body']!.hit}\n`, NET_RULES)
    expect(finding).toMatchObject({
      file: 'pkg/http.ts',
      line: 2,
      rule: 'net-unbounded-body',
      message: 'External response bodies need a byte limit',
    })
    expect(finding?.fix).toContain('readText()')
  })
})

describe('net guardrail ratchet', () => {
  it('treats a new finding as a regression and a lower count as an improvement', () => {
    const findings = scanText('pkg/http.ts', samples['net-retry-after']!.hit, NET_RULES)
    const allowed: Baseline = {
      version: 1,
      include: ['pkg'],
      exclude: [],
      entries: { 'pkg/http.ts': { 'net-retry-after': 1 } },
    }
    expect(compareToBaseline(findings, allowed).regressions).toEqual([])

    const roomToShrink: Baseline = {
      ...allowed,
      entries: { 'pkg/http.ts': { 'net-retry-after': 2 } },
    }
    expect(compareToBaseline(findings, roomToShrink).regressions).toEqual([])
    expect(compareToBaseline(findings, roomToShrink).improvements).toEqual([
      { file: 'pkg/http.ts', rule: 'net-retry-after', allowed: 2, actual: 1 },
    ])

    const empty: Baseline = { ...allowed, entries: {} }
    expect(compareToBaseline(findings, empty).regressions.map(finding => finding.rule)).toEqual(['net-retry-after'])
  })

  it('scans this repository without regressions against the committed baseline', async () => {
    const baseline = JSON.parse(await readFile(join(repoRoot, '.net-rules-baseline.json'), 'utf8')) as Baseline
    expect(baseline.version).toBe(1)
    expect(baseline.include).toEqual(['packages', 'scripts', 'apps', 'tests', 'e2e'])
    expect(baseline.exclude).toContain('packages/net/')

    const findings = await scanRepository({
      root: repoRoot,
      include: baseline.include,
      exclude: baseline.exclude,
      rules: NET_RULES,
    })
    const { regressions } = compareToBaseline(findings, baseline)
    const detail = regressions.map(finding => `${finding.file}:${finding.line} [${finding.rule}]`).join('\n')
    expect(regressions, detail).toEqual([])
  })
})
