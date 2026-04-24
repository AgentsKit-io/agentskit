'use client'

import { useMemo } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'

/**
 * Material UI styled chat. Same headless AgentsKit components — styling comes
 * from MUI's palette via a scoped theme class that targets `data-ak-*`
 * selectors with MUI's elevation + typography tokens.
 */
export function MuiChat() {
  const adapter = useMemo(
    () =>
      createMockAdapter([
        {
          text: 'Swap your design system without rewriting the chat logic — AgentsKit components only emit `data-ak-*` hooks, MUI paints them.',
        },
      ]),
    [],
  )
  const chat = useChat({
    adapter,
    initialMessages: [
      initialAssistant('Ask anything — styled with Material UI tokens.'),
    ],
  })

  return (
    <div
      data-ak-example
      className="ak-theme-mui flex h-[440px] flex-col overflow-hidden rounded-[4px] border border-slate-200 bg-white font-['Roboto',_sans-serif] text-slate-900 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
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
