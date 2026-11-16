import React from 'react'
import { Message, useChat } from '@agentskit/react'
import { agentConfig } from './agent'

/** The AgentsKit UI half: the same agent behind `useChat` and headless `Message`. */
export function ReactUi({ onReady }: { onReady: (chat: ReturnType<typeof useChat>) => void }) {
  const chat = useChat(agentConfig)
  onReady(chat)
  return (
    <div>
      {chat.messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  )
}
