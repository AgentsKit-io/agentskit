import { describe, expect, it } from 'vitest'
import { listingConcierge, marketAnalyst } from '../src/index'
import { SKILL_NAME_RE } from '../fixtures/all-builtin-skills'

/**
 * Dedicated vertical coverage for real-estate skills.
 * Filename matches scripts/check-src-test-parity.mjs expectation so the
 * false-parity allowlist entry for packages/skills/src/real-estate.ts can be removed.
 */
describe.each([
  ['listingConcierge', listingConcierge, 'listing-concierge'],
  ['marketAnalyst', marketAnalyst, 'real-estate-market-analyst'],
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

describe('listingConcierge behaviour rails', () => {
  it('encodes fair-housing refusal rails', () => {
    const p = listingConcierge.systemPrompt
    expect(p).toMatch(/fair[- ]housing/i)
    expect(p).toMatch(/Race|familial status|disability/i)
  })
})

describe('marketAnalyst behaviour rails', () => {
  it('describes markets without price predictions', () => {
    const p = marketAnalyst.systemPrompt
    expect(p).toMatch(/No predictions|no predictions/i)
    expect(p).toMatch(/comps|\$\/sqft|inventory/i)
  })

  it('uses the public real-estate-market-analyst name (CLI resolution key)', () => {
    expect(marketAnalyst.name).toBe('real-estate-market-analyst')
  })
})
