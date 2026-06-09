import { describe, it, expect } from 'vitest'
import {
  validateIntegration,
  assertValidIntegration,
} from '../src/testing/validate'
import { defineIntegration, defineAction, defineTrigger } from '../src/contract'

const goodAction = defineAction({
  name: 'svc_do',
  description: 'do a thing',
  schema: { type: 'object', properties: { x: { type: 'string' } }, required: ['x'] },
  sideEffect: 'write',
  async execute() {
    return 'ok'
  },
})

const goodTrigger = defineTrigger({
  name: 'svc.event',
  source: 'svc',
  verify: () => ({ ok: true }),
  normalize: (raw) => ({ kind: 'event', payload: raw, raw }),
  externalThreadRef: () => ({ kind: 'svc.thread', id: '1' }),
})

const good = defineIntegration({
  name: 'svc',
  displayName: 'Service',
  categories: ['example'],
  auth: { kind: 'apiKey', header: 'authorization' },
  actions: [goodAction],
  triggers: [goodTrigger],
  capabilities: { send: 'svc_do' },
})

describe('validateIntegration', () => {
  it('passes a well-formed descriptor', () => {
    expect(validateIntegration(good)).toEqual([])
    expect(() => assertValidIntegration(good)).not.toThrow()
  })

  it('flags an invalid slug, missing displayName, and empty categories', () => {
    const bad = { ...good, name: 'Bad Name', displayName: '', categories: [] }
    const paths = validateIntegration(bad).map((p) => p.path)
    expect(paths).toContain('name')
    expect(paths).toContain('displayName')
    expect(paths).toContain('categories')
  })

  it('flags a descriptor with no actions and no triggers', () => {
    const bad = defineIntegration({
      name: 'empty',
      displayName: 'Empty',
      categories: ['example'],
      auth: { kind: 'none' },
      actions: [],
    })
    expect(validateIntegration(bad).some((p) => p.path === 'actions')).toBe(true)
  })

  it('flags bad action shape and duplicate action names', () => {
    const dup = defineAction({
      name: 'svc_do',
      description: '',
      schema: { type: 'array' } as never,
      execute: undefined as never,
    })
    const bad = { ...good, actions: [goodAction, dup] }
    const paths = validateIntegration(bad).map((p) => p.path)
    expect(paths).toContain('actions[1].description')
    expect(paths).toContain('actions[1].schema')
    expect(paths).toContain('actions[1].execute')
    expect(paths).toContain('actions[1].name')
  })

  it('flags a bad trigger and dangling capability pointers', () => {
    const badTrigger = defineTrigger({
      name: '',
      source: 'Bad Source',
      normalize: undefined as never,
    })
    const bad = { ...good, triggers: [badTrigger], capabilities: { send: 'nope', notify: 'nope2' } }
    const paths = validateIntegration(bad).map((p) => p.path)
    expect(paths).toContain('triggers[0].name')
    expect(paths).toContain('triggers[0].source')
    expect(paths).toContain('triggers[0].normalize')
    expect(paths).toContain('capabilities.send')
    expect(paths).toContain('capabilities.notify')
  })

  it('assertValidIntegration throws with a readable summary', () => {
    const bad = { ...good, name: 'Nope' }
    expect(() => assertValidIntegration(bad)).toThrow(/failed contract validation/)
  })
})
