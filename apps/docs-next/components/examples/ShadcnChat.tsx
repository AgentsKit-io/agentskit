'use client'

import { useMemo } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'

/**
 * shadcn/ui styled chat. AgentsKit's components are headless — we override
 * the `data-ak-*` attributes with shadcn's token palette (zinc neutrals,
 * zinc-900 accents, shadcn radii) via a scoped CSS class.
 */
export function ShadcnChat() {
  const adapter = useMemo(
    () =>
      createMockAdapter([
        {
          text: 'I am the same `<ChatContainer>` + `<Message>` + `<InputBar>` trio — only the theme tokens changed. Every AgentsKit widget respects `data-ak-*` selectors.',
        },
      ]),
    [],
  )
  const chat = useChat({
    adapter,
    initialMessages: [
      initialAssistant('Ask anything — styled with shadcn/ui tokens.'),
    ],
  })

  return (
    <div
      data-ak-example
      className="ak-theme-shadcn flex h-[440px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
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
