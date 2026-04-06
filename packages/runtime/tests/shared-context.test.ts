import { describe, it, expect } from 'vitest'
import { createSharedContext } from '../src/shared-context'

describe('createSharedContext', () => {
  it('stores and retrieves values', () => {
    const ctx = createSharedContext()
    ctx.set('key', 'value')
    expect(ctx.get('key')).toBe('value')
  })

  it('returns undefined for missing keys', () => {
    const ctx = createSharedContext()
    expect(ctx.get('missing')).toBeUndefined()
  })

  it('overwrites existing values', () => {
    const ctx = createSharedContext()
    ctx.set('key', 'first')
    ctx.set('key', 'second')
    expect(ctx.get('key')).toBe('second')
  })

  it('accepts initial values', () => {
    const ctx = createSharedContext({ project: 'agentskit', version: 1 })
    expect(ctx.get('project')).toBe('agentskit')
    expect(ctx.get('version')).toBe(1)
  })

  it('returns all entries', () => {
    const ctx = createSharedContext({ a: 1 })
    ctx.set('b', 2)
    expect(ctx.entries()).toEqual({ a: 1, b: 2 })
  })

  describe('readOnly', () => {
    it('creates a read-only view', () => {
      const ctx = createSharedContext({ key: 'value' })
      const ro = ctx.readOnly()
      expect(ro.get('key')).toBe('value')
      expect(ro.entries()).toEqual({ key: 'value' })
    })

    it('read-only view reflects writes from parent', () => {
      const ctx = createSharedContext()
      const ro = ctx.readOnly()
      ctx.set('key', 'added')
      expect(ro.get('key')).toBe('added')
    })

    it('read-only view has no set method', () => {
      const ctx = createSharedContext()
      const ro = ctx.readOnly()
      expect((ro as Record<string, unknown>).set).toBeUndefined()
    })
  })
})
