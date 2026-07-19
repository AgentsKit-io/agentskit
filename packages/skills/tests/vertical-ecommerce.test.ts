import { describe, expect, it } from 'vitest'
import { merchandisingAnalyst, storefrontConcierge } from '../src/index'
import { SKILL_NAME_RE } from '../fixtures/all-builtin-skills'

/**
 * Dedicated vertical coverage for ecommerce skills.
 * Filename matches scripts/check-src-test-parity.mjs expectation so the
 * false-parity allowlist entry for packages/skills/src/ecommerce.ts can be removed.
 */
describe.each([
  ['storefrontConcierge', storefrontConcierge, 'storefront-concierge'],
  ['merchandisingAnalyst', merchandisingAnalyst, 'merchandising-analyst'],
] as const)('%s', (_exportName, skill, expectedName) => {
  it('exports the expected SkillDefinition name', () => {
    expect(skill.name).toBe(expectedName)
    expect(skill.name).toMatch(SKILL_NAME_RE)
  })

  it('has non-empty description and substantive systemPrompt', () => {
    expect(skill.description.trim().length).toBeGreaterThan(10)
    expect(skill.systemPrompt.length).toBeGreaterThan(150)
  })

  it('ships at least one non-empty single-turn example (package policy)', () => {
    expect(skill.examples).toBeDefined()
    expect(skill.examples!.length).toBeGreaterThanOrEqual(1)
    for (const ex of skill.examples!) {
      expect(ex.input.trim().length).toBeGreaterThan(0)
      expect(ex.output.trim().length).toBeGreaterThan(0)
    }
  })

  it('tools and delegates are arrays of S1-shaped names without duplicates', () => {
    expect(Array.isArray(skill.tools)).toBe(true)
    expect(Array.isArray(skill.delegates)).toBe(true)
    for (const list of [skill.tools!, skill.delegates!]) {
      expect(new Set(list).size).toBe(list.length)
      for (const name of list) expect(name).toMatch(SKILL_NAME_RE)
    }
  })
})

describe('storefrontConcierge behaviour rails', () => {
  it('refuses price negotiation and payment data handling', () => {
    const p = storefrontConcierge.systemPrompt
    expect(p).toMatch(/No price negotiation|do not have authority to discount/i)
    expect(p).toMatch(/No payment data|card number|CVV/i)
  })

  it('escalates returns/refunds rather than promising outcomes', () => {
    expect(storefrontConcierge.systemPrompt).toMatch(/Returns?\s*\/\s*refunds always escalate|hand off/i)
  })
})

describe('merchandisingAnalyst behaviour rails', () => {
  it('requires time window and auditable queries', () => {
    const p = merchandisingAnalyst.systemPrompt
    expect(p).toMatch(/time window/i)
    expect(p).toMatch(/SQL|query/i)
  })
})
