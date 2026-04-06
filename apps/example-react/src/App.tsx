import { ChatContainer, InputBar, Message, useChat } from '@agentskit/react'
import type { AdapterFactory } from '@agentskit/react'
// @ts-expect-error CSS side-effect import has no type declarations
import '@agentskit/react/theme'

function createDemoAdapter(): AdapterFactory {
  return {
    createSource: ({ messages }) => {
      let cancelled = false

      return {
        stream: async function* () {
          const lastUser = [...messages].reverse().find(message => message.role === 'user')
          const response = [
            'This is the official React example app.',
            'It runs against a local demo adapter so the UI works without API keys.',
            `Latest prompt: "${lastUser?.content ?? ''}"`,
          ].join(' ')

          for (const chunk of response.match(/.{1,18}/g) ?? []) {
            if (cancelled) return
            await new Promise(resolve => setTimeout(resolve, 40))
            yield { type: 'text' as const, content: chunk }
          }

          yield { type: 'done' as const }
        },
        abort: () => {
          cancelled = true
        },
      }
    },
  }
}

export default function App() {
  const chat = useChat({
    adapter: createDemoAdapter(),
    systemPrompt: 'You are the AgentsKit example assistant.',
  })

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">AgentsKit React Example</p>
        <h1>Portable chat UI with the new multi-package ecosystem</h1>
        <p className="lede">
          This example uses <code>@agentskit/react</code> on top of the portable core and runs with
          a local demo adapter so it works immediately.
        </p>
      </section>

      <section className="chat-card">
        <ChatContainer className="chat-surface">
          {chat.messages.map(message => (
            <Message key={message.id} message={message} />
          ))}
          <InputBar chat={chat} placeholder="Ask the demo assistant anything..." />
        </ChatContainer>
      </section>
    </main>
  )
}
