import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import { ToolCallView } from '../src/components/ToolCallView'
import type { ToolCall } from '@agentskit/core'

const baseToolCall: ToolCall = {
  id: 'tc-1',
  name: 'weather',
  args: { city: 'São Paulo' },
  status: 'complete',
  result: 'Sunny, 28°C',
}

describe('ToolCallView', () => {
  it('renders tool name and status', () => {
    const { lastFrame } = render(<ToolCallView toolCall={baseToolCall} />)
    const output = lastFrame()
    expect(output).toContain('weather')
    expect(output).toContain('complete')
  })

  it('hides args and result when not expanded', () => {
    const { lastFrame } = render(<ToolCallView toolCall={baseToolCall} />)
    const output = lastFrame()
    expect(output).not.toContain('São Paulo')
    expect(output).not.toContain('Sunny')
  })

  it('shows args and result when expanded', () => {
    const { lastFrame } = render(<ToolCallView toolCall={baseToolCall} expanded />)
    const output = lastFrame()
    expect(output).toContain('São Paulo')
    expect(output).toContain('Sunny, 28°C')
  })

  it('shows error when expanded and tool errored', () => {
    const errorCall: ToolCall = {
      ...baseToolCall,
      status: 'error',
      result: undefined,
      error: 'API timeout',
    }
    const { lastFrame } = render(<ToolCallView toolCall={errorCall} expanded />)
    const output = lastFrame()
    expect(output).toContain('API timeout')
    expect(output).toContain('error')
  })

  it('shows pending status', () => {
    const pendingCall: ToolCall = {
      ...baseToolCall,
      status: 'pending',
      result: undefined,
    }
    const { lastFrame } = render(<ToolCallView toolCall={pendingCall} />)
    expect(lastFrame()).toContain('pending')
  })

  it('shows running status', () => {
    const runningCall: ToolCall = {
      ...baseToolCall,
      status: 'running',
      result: undefined,
    }
    const { lastFrame } = render(<ToolCallView toolCall={runningCall} />)
    expect(lastFrame()).toContain('running')
  })

  // ── line 19: truncate() is exercised when args exceed argsPreviewChars ─────

  it('truncates long args when expanded', () => {
    const longArgsCall: ToolCall = {
      ...baseToolCall,
      args: { query: 'x'.repeat(300) },
    }
    const { lastFrame } = render(
      <ToolCallView toolCall={longArgsCall} expanded argsPreviewChars={50} />,
    )
    // truncation indicator must appear
    expect(lastFrame()).toContain('…')
  })

  // ── line 27: previewArgs with a string arg (not object) ───────────────────

  it('handles string args in expanded view', () => {
    const stringArgsCall: ToolCall = {
      ...baseToolCall,
      args: 'raw string argument',
    }
    const { lastFrame } = render(<ToolCallView toolCall={stringArgsCall} expanded />)
    expect(lastFrame()).toContain('raw string argument')
  })

  // ── unknown status falls back to pending style ─────────────────────────────

  it('falls back to pending theme for unknown status', () => {
    const unknownCall = {
      ...baseToolCall,
      status: 'unknown_status' as ToolCall['status'],
    }
    const { lastFrame } = render(<ToolCallView toolCall={unknownCall} />)
    // Should still render without crashing
    expect(lastFrame()).toContain('weather')
  })

  // ── resultPreviewChars truncates long result ───────────────────────────────

  it('truncates long result when expanded', () => {
    const longResultCall: ToolCall = {
      ...baseToolCall,
      result: 'y'.repeat(600),
    }
    const { lastFrame } = render(
      <ToolCallView toolCall={longResultCall} expanded resultPreviewChars={100} />,
    )
    expect(lastFrame()).toContain('…')
  })
})
