import { ChatContainer, InputBar, Message, useChat } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

export default function App() {
  const chat = useChat({
    adapter: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? '', model: 'claude-sonnet-4-6' }),
  })

  return (
    <ChatContainer>
      {chat.messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
