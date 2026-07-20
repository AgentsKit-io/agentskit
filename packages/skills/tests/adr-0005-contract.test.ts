import { describe, expect, it } from 'vitest'
import type { SkillDefinition } from '@agentskit/core'
import {
  ALL_BUILTIN_SKILLS,
  BUILTIN_SKILL_COUNT,
  SKILL_NAME_RE,
} from '../fixtures/all-builtin-skills'

/** Keys that must never appear on a SkillDefinition (S10). */
const FORBIDDEN_INVOKE_KEYS = ['run', 'execute', 'invoke'] as const

function serializableCore(skill: SkillDefinition): Record<string, unknown> {
  return {
    name: skill.name,
    description: skill.description,
    systemPrompt: skill.systemPrompt,
    examples: skill.examples,
    tools: skill.tools,
    delegates: skill.delegates,
    temperature: skill.temperature,
    metadata: skill.metadata,
  }
}

describe('ADR 0005 contract harness — all built-in skills', () => {
  it(`covers exactly ${BUILTIN_SKILL_COUNT} exported SkillDefinition objects`, () => {
    expect(ALL_BUILTIN_SKILLS).toHaveLength(BUILTIN_SKILL_COUNT)
  })

  it('all skill names are unique', () => {
    const names = ALL_BUILTIN_SKILLS.map(s => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  for (const skill of ALL_BUILTIN_SKILLS) {
    describe(skill.name, () => {
      it('S1: name is identity-shaped and ≤64 chars', () => {
        expect(typeof skill.name).toBe('string')
        expect(skill.name.length).toBeGreaterThan(0)
        expect(skill.name.length).toBeLessThanOrEqual(64)
        expect(skill.name).toMatch(SKILL_NAME_RE)
      })

      it('S2: description is non-empty one-line human summary', () => {
        expect(typeof skill.description).toBe('string')
        expect(skill.description.trim().length).toBeGreaterThan(0)
        // One-line: no embedded newlines in the marketplace summary field.
        expect(skill.description).not.toMatch(/[\r\n]/)
      })

      it('S3: systemPrompt is substantive and non-empty', () => {
        expect(typeof skill.systemPrompt).toBe('string')
        expect(skill.systemPrompt.trim().length).toBeGreaterThan(50)
      })

      it('S4 + package policy: ≥1 single-turn non-empty input/output example', () => {
        expect(Array.isArray(skill.examples)).toBe(true)
        expect(skill.examples!.length).toBeGreaterThanOrEqual(1)
        for (const ex of skill.examples!) {
          expect(typeof ex.input).toBe('string')
          expect(typeof ex.output).toBe('string')
          expect(ex.input.trim().length).toBeGreaterThan(0)
          expect(ex.output.trim().length).toBeGreaterThan(0)
          // Single-turn pairs only — no multi-message example shape.
          expect(Object.keys(ex).sort()).toEqual(['input', 'output'])
        }
      })

      it('S5: tools are unique S1-shaped string references when present', () => {
        if (skill.tools === undefined) return
        expect(Array.isArray(skill.tools)).toBe(true)
        const seen = new Set<string>()
        for (const t of skill.tools) {
          expect(typeof t).toBe('string')
          expect(t).toMatch(SKILL_NAME_RE)
          expect(seen.has(t)).toBe(false)
          seen.add(t)
        }
      })

      it('S6: delegates are unique S1-shaped string references when present', () => {
        if (skill.delegates === undefined) return
        expect(Array.isArray(skill.delegates)).toBe(true)
        const seen = new Set<string>()
        for (const d of skill.delegates) {
          expect(typeof d).toBe('string')
          expect(d).toMatch(SKILL_NAME_RE)
          expect(seen.has(d)).toBe(false)
          seen.add(d)
        }
      })

      it('S8: temperature absent or in [0, 2]', () => {
        if (skill.temperature === undefined) return
        expect(typeof skill.temperature).toBe('number')
        expect(Number.isFinite(skill.temperature)).toBe(true)
        expect(skill.temperature).toBeGreaterThanOrEqual(0)
        expect(skill.temperature).toBeLessThanOrEqual(2)
      })

      it('S10: no run / execute / invoke keys', () => {
        const record = skill as unknown as Record<string, unknown>
        for (const key of FORBIDDEN_INVOKE_KEYS) {
          expect(key in record).toBe(false)
          expect(record[key]).toBeUndefined()
        }
      })

      it('S12: JSON serialization succeeds and round-trips core data', () => {
        const core = serializableCore(skill)
        const json = JSON.stringify(core)
        expect(typeof json).toBe('string')
        const back = JSON.parse(json) as typeof core
        expect(back.name).toBe(skill.name)
        expect(back.description).toBe(skill.description)
        expect(back.systemPrompt).toBe(skill.systemPrompt)
        expect(back.examples).toEqual(skill.examples)
        expect(back.tools).toEqual(skill.tools)
        expect(back.delegates).toEqual(skill.delegates)
        expect(back.temperature).toEqual(skill.temperature)
        expect(back.metadata).toEqual(skill.metadata)
      })
    })
  }
})
