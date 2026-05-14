/**
 * Tests for the pure utility functions exported from src/app/ChatApp.tsx
 * (renderChatHeader) and the internal groupIntoTurns helper accessed via
 * module inspection.
 *
 * ChatApp itself requires Ink rendering — we only cover the pure helpers here.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('renderChatHeader', () => {
  it('includes provider in output', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    // Use 'demo' provider — requires no API key
    const out = renderChatHeader({ provider: 'demo' })
    expect(out).toContain('provider=demo')
  })

  it('includes model when provided', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    const out = renderChatHeader({ provider: 'demo', model: 'demo-model' })
    expect(out).toContain('model=demo-model')
  })

  it('includes mode in output', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    const out = renderChatHeader({ provider: 'demo' })
    expect(out).toContain('mode=')
  })

  it('includes tools when provided', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    const out = renderChatHeader({ provider: 'demo', tools: 'web_search,shell' })
    expect(out).toContain('tools=web_search,shell')
  })

  it('includes skill when provided', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    const out = renderChatHeader({ provider: 'demo', skill: 'researcher' })
    expect(out).toContain('skill=researcher')
  })

  it('includes memoryBackend when provided', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    const out = renderChatHeader({ provider: 'demo', memoryBackend: 'sqlite' })
    expect(out).toContain('memory=sqlite')
  })

  it('produces minimal output with only provider', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    const out = renderChatHeader({ provider: 'demo' })
    // Should not include tools= or skill= if not provided
    expect(out).not.toContain('tools=')
    expect(out).not.toContain('skill=')
  })
})
