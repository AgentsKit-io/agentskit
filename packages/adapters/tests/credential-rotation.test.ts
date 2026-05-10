import { describe, expect, it, vi } from 'vitest'
import {
  createRotatingCredentials,
  refreshCredentials,
  type CredentialRefreshable,
} from '../src/credential-rotation'

describe('createRotatingCredentials', () => {
  it('exposes the current value and rotates it', async () => {
    const creds = createRotatingCredentials('sk-old-1234', { id: 'openai' })
    expect(await creds.current()).toBe('sk-old-1234')
    await creds.rotate('sk-new-5678')
    expect(await creds.current()).toBe('sk-new-5678')
  })

  it('emits a rotation event with a fingerprint', async () => {
    const creds = createRotatingCredentials('sk-original', { id: 'anthropic' })
    const handler = vi.fn()
    creds.onRotate(handler)
    await creds.rotate('sk-rotated-WXYZ')
    expect(handler).toHaveBeenCalledOnce()
    const event = handler.mock.calls[0]![0]
    expect(event.id).toBe('anthropic')
    expect(event.fingerprint).toBe('WXYZ')
    expect(typeof event.rotatedAt).toBe('string')
  })
})

describe('refreshCredentials', () => {
  it('calls refreshCredentials when supported', async () => {
    const adapter: CredentialRefreshable = { refreshCredentials: vi.fn(async () => {}) }
    const ok = await refreshCredentials(adapter, 'new', { logger: () => {} })
    expect(ok).toBe(true)
    expect(adapter.refreshCredentials).toHaveBeenCalledWith('new')
  })

  it('returns false on unsupported adapter', async () => {
    const ok = await refreshCredentials({}, 'new', { logger: () => {} })
    expect(ok).toBe(false)
  })
})
