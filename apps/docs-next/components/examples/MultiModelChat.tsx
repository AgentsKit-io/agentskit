'use client'

import { useMemo, useState } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'

type Model = 'gpt-4o-mini' | 'claude-sonnet-4-6' | 'gemini-2.5-flash'

const REPLY_BY_MODEL: Record<Model, string> = {
  'gpt-4o-mini': 'OpenAI: clear, concise, and safe — a balanced default for most chat apps.',
  'claude-sonnet-4-6': 'Anthropic: nuanced reasoning, long context, and careful tool use.',
  'gemini-2.5-flash': 'Google: fast, multimodal, and very good at structured output.',
}

export function MultiModelChat() {
  const [model, setModel] = useState<Model>('gpt-4o-mini')
  const adapter = useMemo(
    () => createMockAdapter([{ text: REPLY_BY_MODEL[model] }]),
    [model],
  )
  const chat = useChat({
    adapter,
    initialMessages: [
      initialAssistant(
        'Pick a model — AgentsKit hot-swaps the adapter without touching the rest of the app.',
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[460px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <div className="flex flex-wrap gap-1 border-b border-ak-border p-2">
        {(Object.keys(REPLY_BY_MODEL) as Model[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModel(m)}
            className={`rounded px-3 py-1.5 font-mono text-xs transition ${
              m === model ? 'bg-ak-foam text-ak-midnight' : 'text-ak-graphite hover:text-ak-foam'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <ChatContainer className="flex-1 space-y-2 p-4">
        {chat.messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
