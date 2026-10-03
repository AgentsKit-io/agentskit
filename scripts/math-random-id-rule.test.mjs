import { describe, expect, it } from 'vitest'
import { CORE_RULES } from '../packages/core/src/rules.ts'
import { scanText } from '../packages/cross-platform/src/lint/scan.ts'

const rule = CORE_RULES.filter(item => item.id === 'no-math-random-id')
const scan = text => scanText('packages/demo/src/example.ts', text, rule)

describe('no-math-random-id rule', () => {
  it.each([
    'const id = Math.random().toString(36)',
    'const id = `run-${Math.random()}`',
    'const tempPath = `agent-${Math.random()}.tmp`',
  ])('flags identifier construction: %s', source => {
    expect(scan(source).map(finding => finding.rule)).toEqual(['no-math-random-id'])
  })

  it.each([
    'const jitter = Math.random() * maxJitter',
    'const useVariantA = Math.random() < samplingRate',
  ])('allows non-identifier randomness: %s', source => {
    expect(scan(source)).toEqual([])
  })
})
