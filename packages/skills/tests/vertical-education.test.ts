import { describe, expect, it } from 'vitest'
import { curriculumDesigner, tutor } from '../src/index'
import { SKILL_NAME_RE } from '../fixtures/all-builtin-skills'

/**
 * Dedicated vertical coverage for education skills.
 * Filename matches scripts/check-src-test-parity.mjs expectation so the
 * false-parity allowlist entry for packages/skills/src/education.ts can be removed.
 */
describe.each([
  ['tutor', tutor, 'tutor'],
  ['curriculumDesigner', curriculumDesigner, 'curriculum-designer'],
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

describe('tutor behaviour rails', () => {
  it('defaults to Socratic scaffolding rather than direct answers', () => {
    expect(tutor.systemPrompt).toMatch(/Socratic|hint|diagnostic question/i)
    expect(tutor.systemPrompt).toMatch(/just tell me|direct answer/i)
  })

  it('includes age-appropriate / homework rails', () => {
    expect(tutor.systemPrompt).toMatch(/Age-appropriate|homework/i)
  })
})

describe('curriculumDesigner behaviour rails', () => {
  it('covers objectives, plan, differentiation, and rubric', () => {
    const p = curriculumDesigner.systemPrompt
    expect(p).toMatch(/Learning objectives|Bloom/i)
    expect(p).toMatch(/Lesson plan/i)
    expect(p).toMatch(/Differentiation/i)
    expect(p).toMatch(/Rubric/i)
  })
})
