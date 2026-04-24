'use client'

import { useMemo } from 'react'
import { createLocalStorageMemory } from '@agentskit/core'
import {
  useChat,
  ChatContainer,
  Message,
  InputBar,
  ToolConfirmation,
} from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant, toolsFor } from './_shared/mock-adapter'
import { ToolBadge } from './_shared/tool-badge'

const TURNS = [
  {
    toolCalls: [
      {
        name: 'lookup_order',
        args: { orderId: '#48291' },
        result: { status: 'shipped', eta: '2026-04-25' },
        durationMs: 380,
      },
    ],
    text: 'Order #48291 shipped yesterday, arriving tomorrow. Want me to escalate if it is late?',
  },
  {
    toolCalls: [
      {
        name: 'escalate_ticket',
        args: { orderId: '#48291', priority: 'P2' },
        result: { ok: true, handedOff: true },
        durationMs: 260,
      },
    ],
    text: "Escalated to a human support agent — you'll hear back within 15 minutes.",
  },
]

export function SupportBot() {
  const adapter = useMemo(() => createMockAdapter(TURNS), [])
  const memory = useMemo(
    () => createLocalStorageMemory({ key: 'ak:example:support' }),
    [],
  )
  const baseTools = useMemo(() => toolsFor(TURNS), [])
  const tools = useMemo(
    () =>
      baseTools.map((t) =>
        t.name === 'escalate_ticket' ? { ...t, requiresConfirmation: true } : t,
      ),
    [baseTools],
  )
  const chat = useChat({
    adapter,
    memory,
    tools,
    maxToolIterations: 1,
    initialMessages: [
      initialAssistant(
        'Hi — I can look up orders and escalate to a human when needed. Memory persists in localStorage.',
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[460px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="flex-1 space-y-2 p-4">
        {chat.messages
          .filter((m) => m.role !== 'tool')
          .map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              {m.toolCalls?.map((t) =>
                t.status === 'pending_confirmation' ? (
                  <ToolConfirmation
                    key={t.id}
                    toolCall={t}
                    onApprove={() => chat.approve(t.id)}
                    onDeny={() => chat.deny(t.id)}
                  />
                ) : (
                  <ToolBadge key={t.id} call={t} />
                ),
              )}
              {m.content ? <Message message={m} /> : null}
            </div>
          ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
