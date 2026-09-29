import { describe, expect, it } from 'vitest'
import { CORE_RULES } from '../src/rules'

describe('core guardrail rules', () => {
  it.each([
    ['const id = Math.random().toString(36)', 'no-math-random-id'],
    ['throw new Error("failed")', 'no-raw-error-boundary'],
    ['function canonicalJson(value) { return JSON.stringify(value) }', 'no-local-canonical-json'],
  ])('detects %s', (source, expected) => {
    expect(CORE_RULES.find(rule => rule.id === expected)?.pattern.test(source)).toBe(true)
  })

  it.each([
    'const id = crypto.randomUUID()',
    'throw new RuntimeError({ code: "AK_RUNTIME_FAILED", message: "failed" })',
    'const encoded = canonicalJson(value)',
  ])('allows %s', source => {
    expect(CORE_RULES.some(rule => rule.pattern.test(source))).toBe(false)
  })
})
