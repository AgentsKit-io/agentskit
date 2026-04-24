'use client'

import { useMemo } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant, toolsFor } from './_shared/mock-adapter'
import { ToolBadge } from './_shared/tool-badge'

const TURNS = [
  {
    toolCalls: [
      { name: 'search_web', args: { q: 'latest TC39 stage-3 proposals' }, result: { count: 6 }, durationMs: 540 },
      { name: 'read_url', args: { url: 'https://github.com/tc39/proposals' }, result: { title: 'TC39 proposals', length: 12430 }, durationMs: 380 },
      { name: 'summarise', args: { tokens: 12430 }, result: { summary: 'ok' }, durationMs: 220 },
    ],
    text: 'Pulled six stage-3 proposals and produced a 4-bullet summary — ask for the detail and I will drill down.',
  },
]

export function AgentActions() {
  const adapter = useMemo(() => createMockAdapter(TURNS, 95), [])
  const tools = useMemo(() => toolsFor(TURNS), [])
  const chat = useChat({
    adapter,
    tools,
    maxToolIterations: 1,
    initialMessages: [
      initialAssistant(
        'Watch the live tool-call pipeline — each step streams its own status while the answer is assembled.',
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[500px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="flex-1 space-y-2 p-4">
        {chat.messages
          .filter((m) => m.role !== 'tool')
          .map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              {m.toolCalls?.map((t) => (
                <ToolBadge key={t.id} call={t} />
              ))}
              {m.content ? <Message message={m} /> : null}
            </div>
          ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
