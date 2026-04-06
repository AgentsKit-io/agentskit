import { createLocalStorageMemory } from '@agentskit/core'
import type { AdapterFactory, ToolDefinition } from '@agentskit/core'
import { openai } from '@agentskit/adapters'
import { ChatContainer, InputBar, Message, ToolCallView, useChat } from '@agentskit/react'
// @ts-expect-error CSS side-effect import has no type declarations
import '@agentskit/react/theme'

// --- Demo adapter with sequential tool-call sequence ---

let callCount = 0

function createDemoAdapter(): AdapterFactory {
  return {
    createSource: () => {
      let cancelled = false
      const call = ++callCount

      return {
        stream: async function* () {
          await new Promise(resolve => setTimeout(resolve, 150))

          if (call % 3 === 1) {
            // Call 1: emit a tool_call for get_weather
            yield { type: 'tool_call' as const, toolCall: { id: 'tc1', name: 'get_weather', args: '{"city":"San Francisco"}' } }
            yield { type: 'done' as const }
          } else if (call % 3 === 2) {
            // Call 2: respond using the tool result
            const chunks = [
              'The weather in San Francisco is 72°F and sunny! ',
              'Perfect day for a walk. ',
              'Is there anything else you would like to know?',
            ]
            for (const content of chunks) {
              if (cancelled) return
              await new Promise(resolve => setTimeout(resolve, 60))
              yield { type: 'text' as const, content }
            }
            yield { type: 'done' as const }
          } else {
            // Call 3+: generic response
            const chunks = [
              'This is the AgentsKit React example with tools and memory. ',
              'Try asking about the weather!',
            ]
            for (const content of chunks) {
              if (cancelled) return
              await new Promise(resolve => setTimeout(resolve, 60))
              yield { type: 'text' as const, content }
            }
            yield { type: 'done' as const }
          }
        },
        abort: () => { cancelled = true },
      }
    },
  }
}

// --- Tools ---

const weatherTool: ToolDefinition = {
  name: 'get_weather',
  description: 'Returns current weather for a given city.',
  schema: {
    type: 'object',
    properties: { city: { type: 'string', description: 'City name' } },
    required: ['city'],
  },
  execute: async (args) => {
    const city = args.city as string
    return `72°F, sunny in ${city}.`
  },
}

// --- Adapter: real OpenAI if key present, otherwise demo ---

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

const adapter: AdapterFactory = apiKey
  ? openai({ apiKey, model: 'gpt-4o-mini' })
  : createDemoAdapter()

// --- Memory ---

const memory = createLocalStorageMemory('agentskit-example-react')

// --- App ---

export default function App() {
  const chat = useChat({
    adapter,
    tools: [weatherTool],
    memory,
    systemPrompt: 'You are a helpful AgentsKit assistant. Use the get_weather tool when asked about weather.',
  })

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">AgentsKit React Example</p>
        <h1>Chat with tools and persistent memory</h1>
        <p className="lede">
          Powered by <code>@agentskit/react</code> with a <code>get_weather</code> tool and{' '}
          <code>localStorage</code> memory. Set <code>VITE_OPENAI_API_KEY</code> to use a real model.
        </p>
      </section>

      <section className="chat-card">
        <ChatContainer className="chat-surface">
          {chat.messages.map(message => (
            <div key={message.id}>
              <Message message={message} />
              {message.toolCalls?.map(tc => (
                <ToolCallView key={tc.id} toolCall={tc} />
              ))}
            </div>
          ))}
          <InputBar chat={chat} placeholder="Ask about the weather in any city..." />
        </ChatContainer>
      </section>
    </main>
  )
}
