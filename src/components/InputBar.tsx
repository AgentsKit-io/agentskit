import React, { type FormEvent, type KeyboardEvent } from 'react'
import type { ChatReturn } from '../core/types'

export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}

export function InputBar({ chat, placeholder = 'Type a message...', disabled = false }: InputBarProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (chat.input.trim()) {
      chat.send(chat.input)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (chat.input.trim()) {
        chat.send(chat.input)
      }
    }
  }

  return (
    <form data-ak-input-bar="" onSubmit={handleSubmit}>
      <textarea
        role="textbox"
        value={chat.input}
        onChange={(e) => chat.setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        data-ak-input=""
        rows={1}
      />
      <button type="submit" disabled={disabled || !chat.input.trim()} data-ak-send="">
        Send
      </button>
    </form>
  )
}
