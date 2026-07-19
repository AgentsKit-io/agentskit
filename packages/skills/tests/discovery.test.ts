import { describe, it, expect } from 'vitest'
import { listSkills } from '../src/discovery'
import {
  ALL_BUILTIN_SKILLS,
  BUILTIN_SKILL_COUNT,
  BUILTIN_SKILL_NAMES,
} from '../fixtures/all-builtin-skills'

describe('listSkills', () => {
  it(`returns metadata for exactly all ${BUILTIN_SKILL_COUNT} built-ins in deterministic order`, () => {
    const skills = listSkills()
    expect(skills).toHaveLength(BUILTIN_SKILL_COUNT)

    const names = skills.map(s => s.name)
    expect(new Set(names).size).toBe(BUILTIN_SKILL_COUNT)
    expect(new Set(names)).toEqual(new Set(BUILTIN_SKILL_NAMES))

    // Deterministic order: stable across calls and lexicographic by name.
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    expect(listSkills().map(s => s.name)).toEqual(names)
  })

  it('every name is unique', () => {
    const names = listSkills().map(s => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('each skill has required metadata fields', () => {
    for (const skill of listSkills()) {
      expect(skill.name).toBeTruthy()
      expect(skill.description).toBeTruthy()
      expect(Array.isArray(skill.tools)).toBe(true)
      expect(Array.isArray(skill.delegates)).toBe(true)
    }
  })

  it('planner metadata includes delegates', () => {
    const planner = listSkills().find(s => s.name === 'planner')
    expect(planner?.delegates).toContain('researcher')
    expect(planner?.delegates).toContain('coder')
  })

  it('returned tools/delegates arrays are defensive copies', () => {
    const first = listSkills()
    const planner = first.find(s => s.name === 'planner')
    expect(planner).toBeDefined()

    const toolsBefore = [...(planner!.tools)]
    const delegatesBefore = [...(planner!.delegates)]

    planner!.tools.push('MUTATED_TOOL')
    planner!.delegates.push('MUTATED_DELEGATE')

    const second = listSkills()
    const plannerAgain = second.find(s => s.name === 'planner')
    expect(plannerAgain!.tools).toEqual(toolsBefore)
    expect(plannerAgain!.delegates).toEqual(delegatesBefore)

    // Mutation must not alias exported built-in skill constants either.
    const exported = ALL_BUILTIN_SKILLS.find(s => s.name === 'planner')
    expect(exported?.tools ?? []).not.toContain('MUTATED_TOOL')
    expect(exported?.delegates ?? []).not.toContain('MUTATED_DELEGATE')
  })

  it('covers representative vertical + specialty skills', () => {
    const names = new Set(listSkills().map(s => s.name))
    for (const required of [
      'pr-reviewer',
      'contract-reviewer',
      'real-estate-market-analyst',
      'storefront-concierge',
      'tutor',
      'translator',
    ]) {
      expect(names.has(required)).toBe(true)
    }
  })
})
