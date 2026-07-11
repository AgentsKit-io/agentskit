import { describe, expect, it, vi } from 'vitest'
import { createChatController } from '../src/controller'
import { proposeToolCall } from '../src/tool-proposal'
import { createMockAdapter } from './helpers'

describe('tool authorization contract', () => {
  it('keeps denied trusted proposals out of controller state', async () => {
    const controller = createChatController({
      adapter: createMockAdapter([]),
      tools: [{ name: 'write', requiresConfirmation: true, execute: vi.fn() }],
      authorizeToolCall: () => ({ allowed: false, reason: 'missing capability' }),
    })
    await expect(proposeToolCall(controller, { id: 'denied', name: 'write', args: {} })).rejects.toMatchObject({
      code: 'AK_TOOL_FORBIDDEN',
    })
    expect(controller.getState().messages).toEqual([])
  })
})
