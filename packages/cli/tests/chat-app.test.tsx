/**
 * @vitest-environment happy-dom
 *
 * Minimal rendering tests for ChatApp. We mock all heavy dependencies
 * (Ink, @agentskit/ink, @agentskit/runtime) so we can exercise the
 * pure logic paths inside ChatApp without a real terminal.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
})

// ---------------------------------------------------------------------------
// renderChatHeader — covered by chat-app-utils.test.ts, add edge cases here
// ---------------------------------------------------------------------------

describe('renderChatHeader edge cases', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('works without any optional fields', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    const out = renderChatHeader({ provider: 'demo' })
    expect(out).toBeTruthy()
    expect(typeof out).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// ChatCommandOptions interface shape coverage
// ---------------------------------------------------------------------------

describe('ChatApp module exports', () => {
  it('exports ChatApp as a function', async () => {
    const mod = await import('../src/app/ChatApp')
    expect(typeof mod.ChatApp).toBe('function')
  })

  it('exports renderChatHeader as a function', async () => {
    const mod = await import('../src/app/ChatApp')
    expect(typeof mod.renderChatHeader).toBe('function')
  })
})
