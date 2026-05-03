import React, { useEffect } from 'react'
import {
  ChatContainer,
  InputBar,
  Message,
  ThinkingIndicator,
  ToolCallView,
  ToolConfirmation,
} from '@agentskit/react'
import type { ChatReturn, Message as MessageType, ToolCall } from '@agentskit/core'

const FROZEN_DATE = new Date('2026-01-01T00:00:00.000Z')

function buildMessage(overrides: Partial<MessageType>): MessageType {
  return {
    id: overrides.id ?? 'm-1',
    role: 'assistant',
    content: '',
    status: 'complete',
    createdAt: FROZEN_DATE,
    ...overrides,
  }
}

function buildToolCall(overrides: Partial<ToolCall>): ToolCall {
  return {
    id: overrides.id ?? 'tc-1',
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

interface CaseDef {
  id: string
  render: () => React.ReactNode
}

const CASES: CaseDef[] = [
  {
    id: 'message-user',
    render: () => <Message message={buildMessage({ role: 'user', content: 'Hello, what is the weather?' })} />,
  },
  {
    id: 'message-assistant',
    render: () => <Message message={buildMessage({ content: 'The weather in SF is 72°F and sunny.' })} />,
  },
  {
    id: 'message-streaming',
    render: () => (
      <Message message={buildMessage({ content: 'Working on it...', status: 'streaming' })} />
    ),
  },
  {
    id: 'message-tool',
    render: () => <Message message={buildMessage({ role: 'tool', content: '72°F sunny' })} />,
  },
  {
    id: 'thinking-indicator',
    render: () => <ThinkingIndicator visible />,
  },
  {
    id: 'thinking-indicator-custom-label',
    render: () => <ThinkingIndicator visible label="Reasoning" />,
  },
  {
    id: 'tool-call-pending',
    render: () => <ToolCallView toolCall={buildToolCall({ status: 'pending' })} />,
  },
  {
    id: 'tool-call-running',
    render: () => <ToolCallView toolCall={buildToolCall({ status: 'running' })} />,
  },
  {
    id: 'tool-call-complete',
    render: () => (
      <ToolCallView toolCall={buildToolCall({ status: 'complete', result: '72°F, sunny' })} />
    ),
  },
  {
    id: 'tool-confirmation',
    render: () => (
      <ToolConfirmation
        toolCall={buildToolCall({ status: 'requires_confirmation' })}
        onApprove={() => {}}
        onDeny={() => {}}
      />
    ),
  },
  {
    id: 'input-bar-empty',
    render: () => <InputBar chat={stubChat('')} />,
  },
  {
    id: 'input-bar-typed',
    render: () => <InputBar chat={stubChat('Hello world')} />,
  },
  {
    id: 'input-bar-disabled',
    render: () => <InputBar chat={stubChat('')} disabled />,
  },
  {
    id: 'chat-container-composite',
    render: () => (
      <ChatContainer>
        <Message message={buildMessage({ id: 'u', role: 'user', content: 'Weather in SF?' })} />
        <ToolCallView toolCall={buildToolCall({ status: 'complete', result: '72°F sunny' })} />
        <Message
          message={buildMessage({ id: 'a', content: 'It is sunny and 72°F in San Francisco.' })}
        />
        <InputBar chat={stubChat('')} />
      </ChatContainer>
    ),
  },
]

export const CASE_IDS: string[] = CASES.map(c => c.id)

function Index() {
  return (
    <main>
      <h1>AgentsKit React — Visual Regression Harness</h1>
      <p>Append <code>?case=&lt;id&gt;</code> to view a deterministic component frame.</p>
      <ul>
        {CASES.map(c => (
          <li key={c.id}>
            <a href={`?case=${c.id}`}>{c.id}</a>
          </li>
        ))}
      </ul>
    </main>
  )
}

export function Harness() {
  const params = new URLSearchParams(window.location.search)
  const caseId = params.get('case')

  useEffect(() => {
    if (caseId) {
      document.body.dataset.case = caseId
    } else {
      delete document.body.dataset.case
    }
  }, [caseId])

  if (!caseId) return <Index />
  const found = CASES.find(c => c.id === caseId)
  if (!found) {
    return (
      <main>
        <p>Unknown case: <code>{caseId}</code></p>
        <p><a href="/">back</a></p>
      </main>
    )
  }
  return (
    <div data-case-frame data-case-id={caseId}>
      {found.render()}
    </div>
  )
}
