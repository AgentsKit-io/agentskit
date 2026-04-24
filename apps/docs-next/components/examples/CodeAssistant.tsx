'use client'

import { useMemo } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'
import { MdRenderer } from './_shared/md-renderer'

const TURNS = [
  {
    text: `Here's a minimal \`useChat\` wiring with an OpenAI adapter:

\`\`\`tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { openai } from '@agentskit/adapters/openai'

const adapter = openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o-mini' })

export function Chat() {
  const chat = useChat({ adapter })
  return (
    <ChatContainer>
      {chat.messages.map((m) => <Message key={m.id} message={m} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
\`\`\`

The \`Markdown\` component renders fenced code blocks with Shiki-backed highlighting.`,
  },
  {
    text: `Define a tool with a schema and the model will call it when relevant:

\`\`\`ts
import { defineTool } from '@agentskit/tools'

export const getWeather = defineTool({
  name: 'get_weather',
  description: 'Current weather for a city.',
  schema: { city: 'string' },
  async execute({ city }) {
    const res = await fetch(\`https://api.weather.dev/\${city}\`)
    return res.json()
  },
})
\`\`\``,
  },
]

export function CodeAssistant() {
  const adapter = useMemo(() => createMockAdapter(TURNS, 120), [])
  const chat = useChat({
    adapter,
    initialMessages: [
      initialAssistant(
        'I emit real fenced code blocks — ask for a snippet and `Markdown` will highlight it.',
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[520px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="flex-1 space-y-3 p-4">
        {chat.messages.map((m) => (
          <div key={m.id} data-ak-message data-ak-role={m.role} className="rounded-lg bg-ak-midnight/40 p-3">
            <MdRenderer content={m.content} />
          </div>
        ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
