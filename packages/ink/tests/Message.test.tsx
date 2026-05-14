import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import { Message } from '../src/components/Message'
import type { Message as MessageType } from '@agentskit/core'

function build(overrides: Partial<MessageType>): MessageType {
  return {
    id: 'm-1',
    role: 'assistant',
    content: '',
    status: 'complete',
    createdAt: new Date(),
    ...overrides,
  }
}

describe('Message', () => {
  it('renders role badge and content for user', () => {
    const { lastFrame } = render(<Message message={build({ role: 'user', content: 'hi' })} />)
    const output = lastFrame()
    expect(output).toContain('you')
    expect(output).toContain('hi')
  })

  it('renders tool role in compact dim form with truncated content', () => {
    const longContent = 'x'.repeat(1000)
    const { lastFrame } = render(
      <Message message={build({ role: 'tool', content: longContent })} />,
    )
    const output = lastFrame()
    expect(output).toContain('tool result')
    // Truncation indicator appears when content exceeds the cap.
    expect(output).toContain('…')
  })

  it('shows streaming indicator when assistant is streaming', () => {
    const { lastFrame } = render(
      <Message message={build({ status: 'streaming' })} />,
    )
    expect(lastFrame()).toContain('streaming')
  })

  it('renders markdown through MarkdownText by default for assistant', () => {
    const { lastFrame } = render(
      <Message message={build({ content: '# Hello\n\n- item one\n- item two' })} />,
    )
    const output = lastFrame()
    expect(output).toContain('Hello')
    expect(output).toContain('item one')
  })

  it('renders plain text when markdown prop is false', () => {
    const { lastFrame } = render(
      <Message message={build({ content: '**bold**' })} markdown={false} />,
    )
    expect(lastFrame()).toContain('**bold**')
  })

  it('renders inline token usage footer when metadata.usage is present', () => {
    const { lastFrame } = render(
      <Message
        message={build({
          content: 'answer',
          metadata: {
            usage: { promptTokens: 1200, completionTokens: 350, totalTokens: 1550 },
          },
        })}
      />,
    )
    const output = lastFrame()
    expect(output).toContain('tokens')
    expect(output).toContain('1.2k')
    expect(output).toContain('350')
    expect(output).toContain('1.6k')
    expect(output).toContain('total')
  })

  it('hides usage footer when totalTokens is zero', () => {
    const { lastFrame } = render(
      <Message
        message={build({
          content: 'answer',
          metadata: { usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } },
        })}
      />,
    )
    expect(lastFrame()).not.toContain('tokens')
  })

  it('showUsage={false} suppresses the token footer', () => {
    const { lastFrame } = render(
      <Message
        message={build({
          content: 'answer',
          metadata: { usage: { promptTokens: 50, completionTokens: 40, totalTokens: 90 } },
        })}
        showUsage={false}
      />,
    )
    expect(lastFrame()).not.toContain('tokens')
  })

  // ── line 25: formatTokens branch for values ≥ 1_000_000 ──────────────────

  it('formats token counts in millions when totalTokens exceeds 1M', () => {
    const { lastFrame } = render(
      <Message
        message={build({
          content: 'answer',
          metadata: {
            usage: {
              promptTokens: 1_500_000,
              completionTokens: 2_100_000,
              totalTokens: 3_600_000,
            },
          },
        })}
      />,
    )
    const output = lastFrame()
    expect(output).toContain('m')
    expect(output).toContain('tokens')
  })

  // ── unknown role falls back to assistant theme ─────────────────────────────

  it('renders unknown role using assistant fallback theme', () => {
    const { lastFrame } = render(
      <Message message={build({ role: 'system' as MessageType['role'], content: 'sys msg' })} />,
    )
    expect(lastFrame()).toContain('sys msg')
  })
})
