import { type JSX } from 'solid-js'
import type { ChatReturn } from '@agentskit/core'

/** Props accepted by the chat input and submit control. */
export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}

/** Render an input that sends non-empty chat text on submit.
 * @param props The chat controller and optional input settings.
 * @returns The headless chat input form.
 */
export function InputBar(props: InputBarProps): JSX.Element {
  const placeholder = () => props.placeholder ?? 'Type a message...'
  const blocked = () => (props.disabled ?? false) || props.chat.status === 'streaming'

  const trySend = (): void => {
    if (blocked() || !props.chat.input.trim()) return
    void props.chat.send(props.chat.input)
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    trySend()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      trySend()
    }
  }

  return (
    <form data-ak-input-bar="" onSubmit={handleSubmit}>
      <textarea
        value={props.chat.input}
        onInput={(e) => props.chat.setInput(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder()}
        disabled={blocked()}
        data-ak-input=""
        rows={1}
      />
      <button
        type="submit"
        disabled={blocked() || !props.chat.input.trim()}
        data-ak-send=""
      >
        Send
      </button>
    </form>
  )
}
