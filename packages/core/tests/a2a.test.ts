import { describe, expect, it } from 'vitest'
import { A2A_PROTOCOL_VERSION, validateAgentCard } from '../src/a2a'

describe('A2A protocol', () => {
  it('exposes a stable version string', () => {
    expect(typeof A2A_PROTOCOL_VERSION).toBe('string')
    expect(A2A_PROTOCOL_VERSION.length).toBeGreaterThan(0)
  })

  it('validates a well-formed agent card', () => {
    const card = validateAgentCard({
      id: 'com.example.agent',
      name: 'ExampleAgent',
      version: '1.0.0',
      skills: [
        { name: 'summarize', description: 'summarizes stuff' },
      ],
    })
    expect(card.id).toBe('com.example.agent')
    expect(card.skills[0]!.name).toBe('summarize')
  })

  it('rejects missing fields', () => {
    expect(() => validateAgentCard({})).toThrow(/id required/)
    expect(() => validateAgentCard({ id: 'x' })).toThrow(/name required/)
    expect(() => validateAgentCard({ id: 'x', name: 'n' })).toThrow(/version required/)
    expect(() => validateAgentCard({ id: 'x', name: 'n', version: '1' })).toThrow(/skills must be array/)
  })

  it('rejects malformed skill entries', () => {
    expect(() =>
      validateAgentCard({ id: 'x', name: 'n', version: '1', skills: [{}] }),
    ).toThrow(/skills\[0\].name/)
  })
})
