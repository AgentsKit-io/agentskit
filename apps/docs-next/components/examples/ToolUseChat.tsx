'use client'

import { useMemo } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant, toolsFor } from './_shared/mock-adapter'
import { ToolBadge } from './_shared/tool-badge'

const TURNS = [
  {
    toolCalls: [
      {
        name: 'search_catalog',
        args: { query: 'wireless headphones' },
        result: { items: [{ id: 'h-42', name: 'Aurora ANC', price: 189 }] },
        durationMs: 420,
      },
    ],
    text: 'Aurora ANC ($189) is the best match — active noise cancellation, 30h battery.',
  },
  {
    toolCalls: [
      {
        name: 'get_inventory',
        args: { sku: 'h-42' },
        result: { stock: 12, warehouse: 'LAX' },
        durationMs: 260,
      },
    ],
    text: '12 units in the LAX warehouse, ships same-day.',
  },
]

export function ToolUseChat() {
  const adapter = useMemo(() => createMockAdapter(TURNS), [])
  const tools = useMemo(() => toolsFor(TURNS), [])
  const chat = useChat({
    adapter,
    tools,
    maxToolIterations: 1,
    initialMessages: [
      initialAssistant(
        "I can browse a product catalog. Ask about an item and I'll call the right tool.",
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[420px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
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
