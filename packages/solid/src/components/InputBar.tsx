import { type JSX } from 'solid-js'
import type { ChatReturn } from '@agentskit/core'

export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}

export function InputBar(props: InputBarProps): JSX.Element {
  const placeholder = () => props.placeholder ?? 'Type a message...'
  const disabled = () => props.disabled ?? false

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (props.chat.input.trim()) {
      props.chat.send(props.chat.input)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (props.chat.input.trim()) {
        props.chat.send(props.chat.input)
      }
    }
  }

  return (
    <form data-ak-input-bar="" onSubmit={handleSubmit}>
      <textarea
        role="textbox"
        value={props.chat.input}
        onInput={(e) => props.chat.setInput(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder()}
        disabled={disabled()}
        data-ak-input=""
        rows={1}
      />
      <button
        type="submit"
        disabled={disabled() || !props.chat.input.trim()}
        data-ak-send=""
      >
        Send
      </button>
    </form>
  )
}
