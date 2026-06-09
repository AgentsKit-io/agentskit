import { describe, it, expect } from 'vitest'
import {
  registerIntegration,
  getIntegration,
  listIntegrations,
  integrationsByCategory,
} from '../src/registry'
import { defineIntegration, defineAction } from '../src/contract'

const fixture = defineIntegration({
  name: 'fixture-svc',
  displayName: 'Fixture',
  categories: ['example'],
  auth: { kind: 'none' },
  actions: [
    defineAction({
      name: 'fixture_noop',
      description: 'noop',
      schema: { type: 'object', properties: {}, required: [] },
      async execute() {
        return null
      },
    }),
  ],
})

describe('default registry', () => {
  it('registers into and reads from the shared catalog', () => {
    registerIntegration(fixture)
    expect(getIntegration('fixture-svc')?.displayName).toBe('Fixture')
    expect(listIntegrations().some((i) => i.name === 'fixture-svc')).toBe(true)
    expect(integrationsByCategory('example').some((i) => i.name === 'fixture-svc')).toBe(true)
  })
})
