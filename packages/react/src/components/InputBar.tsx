import React, { type FormEvent, type KeyboardEvent } from 'react'
import type { ChatReturn } from '@agentskit/core'

export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}

export function InputBar({ chat, placeholder = 'Type a message...', disabled = false }: InputBarProps) {
  const isStreaming = chat.status === 'streaming'
  const blocked = disabled || isStreaming

  const trySend = (): void => {
    if (blocked || !chat.input.trim()) return
    void chat.send(chat.input)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    trySend()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      trySend()
    }
  }

  return (
    <form data-ak-input-bar="" onSubmit={handleSubmit}>
      <textarea
        value={chat.input}
        onChange={(e) => chat.setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={blocked}
        data-ak-input=""
        rows={1}
      />
      <button type="submit" disabled={blocked || !chat.input.trim()} data-ak-send="">
        Send
      </button>
    </form>
  )
}
