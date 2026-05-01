import { describe, it, expect } from 'vitest'
import { healthcareAssistant, clinicalNoteSummarizer, financialAdvisor, transactionTriage } from '../src/index'

describe.each([
  ['healthcareAssistant', healthcareAssistant],
  ['clinicalNoteSummarizer', clinicalNoteSummarizer],
  ['financialAdvisor', financialAdvisor],
  ['transactionTriage', transactionTriage],
])('%s', (_name, skill) => {
  it('satisfies SkillDefinition contract', () => {
    expect(skill.name).toBeTruthy()
    expect(skill.description).toBeTruthy()
    expect(skill.systemPrompt.length).toBeGreaterThan(200)
    expect(Array.isArray(skill.tools)).toBe(true)
    expect(Array.isArray(skill.delegates)).toBe(true)
  })
})

describe('healthcareAssistant', () => {
  it('refuses diagnosis and dosage', () => {
    const p = healthcareAssistant.systemPrompt
    expect(p).toMatch(/[Dd]iagnose/)
    expect(p).toMatch(/[Dd]osage/)
  })
  it('emergency screen first', () => {
    expect(healthcareAssistant.systemPrompt).toMatch(/[Ee]mergency/)
  })
})

describe('financialAdvisor', () => {
  it('forbids "should you" and recommend verbs', () => {
    expect(financialAdvisor.systemPrompt).toMatch(/[Ff]orbidden verbs/)
    expect(financialAdvisor.systemPrompt).toMatch(/[Rr]ecommend/)
  })
  it('disclaims investment / tax / legal advice', () => {
    expect(financialAdvisor.systemPrompt).toMatch(/not investment, tax, or legal advice/)
  })
})
