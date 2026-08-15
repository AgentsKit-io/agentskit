'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import type { AdapterFactory, StreamChunk } from '@agentskit/core'
import { track } from '@/lib/analytics-client'
import '@/styles/agentskit-theme.css'

const FAKE_REPLIES = [
  'Welcome to AgentsKit. Streaming is on by default.',
  'Swap the adapter in one line to change providers.',
  'Tools and memory are optional — compose what you need.',
]

function createMockAdapter(replies: string[] = FAKE_REPLIES): AdapterFactory {
  let turn = 0
  return {
    createSource: () => ({
      stream: async function* (): AsyncIterableIterator<StreamChunk> {
        const reply = replies[turn++ % replies.length]
        for (const ch of reply) {
          await new Promise((r) => setTimeout(r, 18))
          yield { type: 'text', content: ch }
        }
        yield { type: 'done' }
      },
      abort() {},
    }),
    capabilities: { streaming: true },
  }
}

export function ChatPreview() {
  const adapter = useMemo(() => createMockAdapter(), [])
  const exampleReported = useRef(false)
  const chat = useChat({
    adapter,
    initialMessages: [
      {
        id: 'init',
        role: 'assistant',
        content: 'Hi, ask me something.',
        status: 'complete',
        createdAt: new Date(),
      },
    ],
  })

  useEffect(() => {
    if (exampleReported.current) return
    const hasUserMessage = chat.messages.some((message) => message.role === 'user')
    const hasCompletedReply = chat.messages.some(
      (message) => message.role === 'assistant' && message.id !== 'init' && message.status === 'complete',
    )
    if (!hasUserMessage || !hasCompletedReply) return

    track('example_completed', {
      example_id: 'learn-chat-preview',
      completion_type: 'streaming_chat',
      surface: 'learn',
    })
    exampleReported.current = true
  }, [chat.messages])

  return (
    <div
      data-ak-learn-preview
      className="flex h-[420px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="ak-chat-surface flex-1 space-y-2 p-4">
        {chat.messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
