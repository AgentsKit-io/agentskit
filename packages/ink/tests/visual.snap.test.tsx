import React from 'react'
import { describe, expect, it } from 'vitest'
import { render } from 'ink-testing-library'
import { ChatContainer } from '../src/components/ChatContainer'
import { InputBar } from '../src/components/InputBar'
import { Message } from '../src/components/Message'
import { StatusHeader } from '../src/components/StatusHeader'
import { ThinkingIndicator } from '../src/components/ThinkingIndicator'
import { ToolCallView } from '../src/components/ToolCallView'
import { ToolConfirmation } from '../src/components/ToolConfirmation'
import type { ChatReturn, Message as MessageType, ToolCall } from '@agentskit/core'

/**
 * Visual regression for @agentskit/ink components — issue #253.
 *
 * Snapshots capture the raw ANSI frame from `ink-testing-library`,
 * which includes color, style, and layout. Snapshot only the first
 * synchronous frame to avoid spinner / cursor frame drift; this is
 * deterministic because animation timers fire after first render.
 */

const FROZEN_DATE = new Date('2026-01-01T00:00:00.000Z')

function buildMessage(overrides: Partial<MessageType>): MessageType {
  return {
    id: 'm-1',
    role: 'assistant',
    content: '',
    status: 'complete',
    createdAt: FROZEN_DATE,
    ...overrides,
  }
}

function buildToolCall(overrides: Partial<ToolCall>): ToolCall {
  return {
    id: 'tc-1',
    name: 'get_weather',
    args: { city: 'San Francisco' },
    status: 'pending',
    ...overrides,
  }
}

function stubChat(input = ''): ChatReturn {
  return {
    messages: [],
    input,
    setInput: () => {},
    send: async () => {},
    abort: () => {},
    clear: () => {},
    status: 'idle',
    approve: () => {},
    deny: () => {},
  } as unknown as ChatReturn
}

describe('visual regression — Message', () => {
  it('user message', () => {
    const { lastFrame } = render(<Message message={buildMessage({ role: 'user', content: 'What is the weather in SF?' })} />)
    expect(lastFrame()).toMatchSnapshot()
  })

  it('assistant message — plain text', () => {
    const { lastFrame } = render(
      <Message message={buildMessage({ content: 'It is sunny and 72°F.' })} markdown={false} />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })

  it('assistant message — markdown', () => {
    const { lastFrame } = render(
      <Message message={buildMessage({ content: '# Forecast\n\n- **SF**: sunny\n- *NYC*: cloudy' })} />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })

  it('assistant message — streaming', () => {
    const { lastFrame } = render(
      <Message message={buildMessage({ content: 'Working on it', status: 'streaming' })} markdown={false} />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })

  it('tool result message — truncated', () => {
    const { lastFrame } = render(
      <Message message={buildMessage({ role: 'tool', content: 'x'.repeat(800) })} />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })

  it('assistant with token usage footer', () => {
    const { lastFrame } = render(
      <Message
        message={buildMessage({
          content: 'Done.',
          metadata: { usage: { promptTokens: 1200, completionTokens: 350, totalTokens: 1550 } },
        })}
        markdown={false}
      />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })
})

describe('visual regression — ToolCallView', () => {
  it('pending — collapsed', () => {
    const { lastFrame } = render(<ToolCallView toolCall={buildToolCall({ status: 'pending' })} />)
    expect(lastFrame()).toMatchSnapshot()
  })

  it('running — collapsed (first spinner frame)', () => {
    const { lastFrame } = render(<ToolCallView toolCall={buildToolCall({ status: 'running' })} />)
    expect(lastFrame()).toMatchSnapshot()
  })

  it('complete — expanded with result', () => {
    const { lastFrame } = render(
      <ToolCallView
        toolCall={buildToolCall({ status: 'complete', result: '72°F, sunny' })}
        expanded
      />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })

  it('error — expanded with error message', () => {
    const { lastFrame } = render(
      <ToolCallView
        toolCall={buildToolCall({ status: 'error', error: 'API rate limit exceeded' })}
        expanded
      />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })
})

describe('visual regression — ToolConfirmation', () => {
  it('renders three options with first selected', () => {
    const { lastFrame } = render(
      <ToolConfirmation
        toolCall={buildToolCall({ status: 'requires_confirmation' })}
        onApprove={() => {}}
        onDeny={() => {}}
      />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })

  it('returns nothing when toolCall is not awaiting confirmation', () => {
    const { lastFrame } = render(
      <ToolConfirmation
        toolCall={buildToolCall({ status: 'complete' })}
        onApprove={() => {}}
        onDeny={() => {}}
      />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })
})

describe('visual regression — StatusHeader', () => {
  it('full segments', () => {
    const { lastFrame } = render(
      <StatusHeader
        provider="openai"
        model="gpt-4o-mini"
        mode="live"
        tools={['get_weather', 'web_search']}
        messageCount={4}
        sessionId="abcdef0123456789"
      />,
    )
    expect(lastFrame()).toMatchSnapshot()
  })

  it('title only', () => {
    const { lastFrame } = render(<StatusHeader title="Custom CLI" />)
    expect(lastFrame()).toMatchSnapshot()
  })
})

describe('visual regression — ThinkingIndicator', () => {
  it('visible — first spinner frame', () => {
    const { lastFrame } = render(<ThinkingIndicator visible />)
    expect(lastFrame()).toMatchSnapshot()
  })

  it('visible — custom label', () => {
    const { lastFrame } = render(<ThinkingIndicator visible label="Reasoning" />)
    expect(lastFrame()).toMatchSnapshot()
  })

  it('hidden — renders nothing', () => {
    const { lastFrame } = render(<ThinkingIndicator visible={false} />)
    expect(lastFrame()).toMatchSnapshot()
  })
})

describe('visual regression — InputBar', () => {
  it('idle — empty input shows placeholder hint', () => {
    const { lastFrame } = render(<InputBar chat={stubChat('')} />)
    expect(lastFrame()).toMatchSnapshot()
  })

  it('idle — typed input', () => {
    const { lastFrame } = render(<InputBar chat={stubChat('hello world')} />)
    expect(lastFrame()).toMatchSnapshot()
  })

  it('disabled', () => {
    const { lastFrame } = render(<InputBar chat={stubChat('')} disabled />)
    expect(lastFrame()).toMatchSnapshot()
  })
})

describe('visual regression — ChatContainer composite', () => {
  it('renders user + assistant exchange with tool call', () => {
    const { lastFrame } = render(
      <ChatContainer>
        <Message message={buildMessage({ id: 'u', role: 'user', content: 'weather in SF?' })} />
        <ToolCallView toolCall={buildToolCall({ status: 'complete', result: '72°F sunny' })} expanded />
        <Message message={buildMessage({ content: 'It is sunny and 72°F.' })} markdown={false} />
      </ChatContainer>,
    )
    expect(lastFrame()).toMatchSnapshot()
  })
})
