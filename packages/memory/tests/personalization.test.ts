import { describe, expect, it } from 'vitest'
import {
  createInMemoryPersonalization,
  renderProfileContext,
} from '../src/personalization'

describe('createInMemoryPersonalization', () => {
  it('returns null for unknown subjects', async () => {
    const store = createInMemoryPersonalization()
    expect(await store.get('x')).toBeNull()
  })

  it('set + get round-trip', async () => {
    const store = createInMemoryPersonalization()
    await store.set({ subjectId: 'u1', traits: { tone: 'friendly' }, updatedAt: '' })
    const hit = await store.get('u1')
    expect(hit?.traits).toEqual({ tone: 'friendly' })
    expect(hit?.updatedAt).toBeTruthy()
  })

  it('merge adds new keys without dropping old ones', async () => {
    const store = createInMemoryPersonalization()
    await store.merge('u1', { tone: 'friendly' })
    const merged = await store.merge('u1', { language: 'pt-BR' })
    expect(merged.traits).toEqual({ tone: 'friendly', language: 'pt-BR' })
  })

  it('delete removes the profile', async () => {
    const store = createInMemoryPersonalization()
    await store.merge('u1', { k: 1 })
    await store.delete?.('u1')
    expect(await store.get('u1')).toBeNull()
  })
})

describe('renderProfileContext', () => {
  it('returns empty string for null or empty profiles', () => {
    expect(renderProfileContext(null)).toBe('')
    expect(renderProfileContext({ subjectId: 'u', traits: {}, updatedAt: '' })).toBe('')
  })

  it('skips null/empty trait values', () => {
    const output = renderProfileContext({
      subjectId: 'u',
      traits: { a: 'hi', b: '', c: null, d: 42 },
      updatedAt: '',
    })
    expect(output).toContain('a: hi')
    expect(output).toContain('d: 42')
    expect(output).not.toContain('b:')
    expect(output).not.toContain('c:')
  })
})
