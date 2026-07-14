import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react-native'
import { anthropic } from '@agentskit/adapters'

export function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  })

  return (
    <ChatContainer>
      {chat.messages.map((m) => <Message key={m.id} message={m} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
