'use client'

import { useMemo } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'

const RESPONSES = [
  "Great question! Streaming works by sending tokens incrementally. AgentsKit flushes chunks into the UI on each animation frame so the interface stays responsive at high token rates.",
  "`useChat` from @agentskit/react wraps state, streaming, abort, and retries. Internally it uses a ChatController from @agentskit/core backed by the adapter's StreamSource.",
  "Tokens are atomic units LLMs work with — roughly 3–4 characters. AgentsKit batches chunks and the default Message component renders each incremental update without layout thrash.",
  "Context windows are measured in tokens. AgentsKit prunes older messages when you approach the limit so long conversations stay coherent without hitting provider errors.",
]

export function BasicChat() {
  const adapter = useMemo(
    () => createMockAdapter(RESPONSES.map((text) => ({ text }))),
    [],
  )
  const chat = useChat({
    adapter,
    initialMessages: [
      initialAssistant(
        "Hi! I'm your AI assistant. Ask me anything about streaming, React hooks, or how AgentsKit works under the hood.",
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[420px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="flex-1 space-y-2 p-4">
        {chat.messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
