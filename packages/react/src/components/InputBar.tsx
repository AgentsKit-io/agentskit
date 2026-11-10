import React, { type FormEvent, type KeyboardEvent } from 'react'
import type { ChatReturn } from '@agentskit/core'

/** Props for an input form bound to a chat return value. */
export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}

/**
 * Render a chat input that sends on submit or Enter without Shift.
 * @param props The chat actions, placeholder, and optional disabled flag.
 * @returns The chat input form.
 * @example
 * ```tsx
 * <InputBar chat={chat} />
 * ```
 */
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
