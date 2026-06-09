import { describe, it, expect } from 'vitest'
import { createRegistry } from '../src/registry'
import { defineIntegration, defineAction } from '../src/contract'

const ping = defineAction({
  name: 'demo_ping',
  description: 'ping',
  schema: { type: 'object', properties: {}, required: [] },
  async execute() {
    return 'pong'
  },
})

function demo(name: string, categories = ['example']) {
  return defineIntegration({
    name,
    displayName: name,
    categories,
    auth: { kind: 'none' },
    actions: [ping],
  })
}

describe('createRegistry', () => {
  it('registers, gets, and lists descriptors', () => {
    const reg = createRegistry([demo('slack', ['comms'])])
    reg.register(demo('github', ['dev']))
    expect(reg.has('slack')).toBe(true)
    expect(reg.get('github')?.displayName).toBe('github')
    expect(reg.list().map((i) => i.name).sort()).toEqual(['github', 'slack'])
  })

  it('throws on duplicate registration', () => {
    const reg = createRegistry([demo('slack')])
    expect(() => reg.register(demo('slack'))).toThrow(/already registered/)
  })

  it('filters by category', () => {
    const reg = createRegistry([demo('slack', ['comms']), demo('github', ['dev'])])
    expect(reg.byCategory('comms').map((i) => i.name)).toEqual(['slack'])
  })

  it('returns undefined for unknown names', () => {
    const reg = createRegistry()
    expect(reg.get('nope')).toBeUndefined()
    expect(reg.has('nope')).toBe(false)
  })
})
