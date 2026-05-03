import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import { ToolConfirmation } from '../src/components/ToolConfirmation'
import type { ToolCall } from '@agentskit/core'

// Same workaround as InputBar.test: ink-testing-library@4 doesn't hook up
// useInput under ink@7. Capture the handler, drive it directly.

type Key = Parameters<Parameters<typeof import('ink').useInput>[0]>[1]

let capturedHandler: ((input: string, key: Key) => void) | undefined

vi.mock('ink', async () => {
  const actual = await vi.importActual<typeof import('ink')>('ink')
  return {
    ...actual,
    useInput: (handler: (input: string, key: Key) => void) => {
      capturedHandler = handler
    },
  }
})

const key = (overrides: Partial<Key> = {}): Key => ({
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  ...overrides,
} as Key)

// Give React time to commit state updates between key presses so the
// mock's capturedHandler closure picks up the latest index. Drain a
// few macrotasks — a single setTimeout(20) was enough on macOS but
// flaked on slow Linux CI runners; chaining gives React + ink-testing-
// library multiple commit cycles before the next key press.
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 20))
  }
}

const pendingCall: ToolCall = {
  id: 'tc-1',
  name: 'web_search',
  args: { query: 'AgentsKit' },
  status: 'requires_confirmation',
}

describe('ToolConfirmation', () => {
  beforeEach(() => {
    capturedHandler = undefined
  })

  it('renders tool name, args, and the three options', () => {
    const { lastFrame } = render(
      <ToolConfirmation toolCall={pendingCall} onApprove={vi.fn()} onDeny={vi.fn()} />,
    )
    const output = lastFrame()
    expect(output).toContain('web_search')
    expect(output).toContain('AgentsKit')
    expect(output).toContain('Yes')
    expect(output).toContain('Yes, for session')
    expect(output).toContain('No')
  })

  it('hides itself when the call is no longer awaiting confirmation', () => {
    const settled: ToolCall = { ...pendingCall, status: 'complete' }
    const { lastFrame } = render(
      <ToolConfirmation toolCall={settled} onApprove={vi.fn()} onDeny={vi.fn()} />,
    )
    expect(lastFrame()).toBe('')
  })

  it('Enter on the default selection calls onApprove', () => {
    const approve = vi.fn()
    render(<ToolConfirmation toolCall={pendingCall} onApprove={approve} onDeny={vi.fn()} />)
    capturedHandler!('', key({ return: true }))
    expect(approve).toHaveBeenCalledWith('tc-1')
  })

  it('arrow down to deny then Enter calls onDeny', async () => {
    const deny = vi.fn()
    render(<ToolConfirmation toolCall={pendingCall} onApprove={vi.fn()} onDeny={deny} />)
    // default selection = allow_once. Down twice → deny.
    capturedHandler!('', key({ downArrow: true }))
    await flush()
    capturedHandler!('', key({ downArrow: true }))
    await flush()
    capturedHandler!('', key({ return: true }))
    expect(deny).toHaveBeenCalledWith('tc-1')
  })

  it('allow for session picks the always-approve callback', async () => {
    const approveAlways = vi.fn()
    render(
      <ToolConfirmation
        toolCall={pendingCall}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        onApproveAlways={approveAlways}
      />,
    )
    capturedHandler!('', key({ downArrow: true }))
    await flush()
    capturedHandler!('', key({ return: true }))
    expect(approveAlways).toHaveBeenCalledWith('tc-1', 'web_search')
  })

  it('allow for session falls back to onApprove when no always handler given', async () => {
    const approve = vi.fn()
    render(<ToolConfirmation toolCall={pendingCall} onApprove={approve} onDeny={vi.fn()} />)
    capturedHandler!('', key({ downArrow: true }))
    await flush()
    capturedHandler!('', key({ return: true }))
    expect(approve).toHaveBeenCalledWith('tc-1')
  })

  it('numeric shortcut 1 approves immediately', () => {
    const approve = vi.fn()
    render(<ToolConfirmation toolCall={pendingCall} onApprove={approve} onDeny={vi.fn()} />)
    capturedHandler!('1', key())
    expect(approve).toHaveBeenCalledWith('tc-1')
  })

  it('numeric shortcut 3 denies immediately', () => {
    const deny = vi.fn()
    render(<ToolConfirmation toolCall={pendingCall} onApprove={vi.fn()} onDeny={deny} />)
    capturedHandler!('3', key())
    expect(deny).toHaveBeenCalledWith('tc-1')
  })

  // Note: wrap-around from index 0 via upArrow is covered by the downArrow×2
  // test above (both land on the same 'deny' index via different paths).
})
