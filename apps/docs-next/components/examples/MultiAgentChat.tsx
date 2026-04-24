'use client'

import { useMemo } from 'react'
import { useChat, ChatContainer, Message, InputBar, ThinkingIndicator } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'

export function MultiAgentChat() {
  const adapter = useMemo(
    () =>
      createMockAdapter(
        [
          {
            reasoning:
              '[planner] break down the request → research, draft, review.\n[worker] start with research, then hand off to drafter.\n[reviewer] queue for final pass.',
            text: '**Planner → Worker → Reviewer** topology produced:\n\n1. Researcher: gathered 4 sources.\n2. Drafter: produced a 180-word outline.\n3. Reviewer: approved with minor edits.\n\nReady to execute.',
          },
        ],
        140,
      ),
    [],
  )
  const chat = useChat({
    adapter,
    systemPrompt:
      'You orchestrate a planner / worker / reviewer triad. Emit a reasoning trace for each hand-off before the final answer.',
    initialMessages: [
      initialAssistant(
        'Give me a task — I plan, delegate, and review before replying. The reasoning trace shows each hand-off.',
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[460px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="flex-1 space-y-2 p-4">
        {chat.messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
        {chat.status === 'streaming' && <ThinkingIndicator label="agents coordinating" />}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
