import { useChat, ChatContainer, Message, InputBar } from '@agentskit/solid'
import { For } from 'solid-js'
import { anthropic } from '@agentskit/adapters'

export function App() {
  const chat = useChat({
    adapter: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  })

  return (
    <ChatContainer>
      <For each={chat.messages}>{(m) => <Message message={m} />}</For>
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
