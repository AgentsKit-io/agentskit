<script lang="ts">
  import type { ChatReturn } from '@agentskit/core'

  let {
    chat,
    placeholder = 'Type a message...',
    disabled = false,
  }: { chat: ChatReturn; placeholder?: string; disabled?: boolean } = $props()

  function submit() {
    if (chat.input.trim()) chat.send(chat.input)
  }
</script>

<form
  data-ak-input-bar
  onsubmit={(e) => {
    e.preventDefault()
    submit()
  }}
>
  <textarea
    role="textbox"
    data-ak-input
    rows="1"
    {placeholder}
    {disabled}
    value={chat.input}
    oninput={(e) => chat.setInput(e.currentTarget.value)}
    onkeydown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    }}
  ></textarea>
  <button data-ak-send type="submit" disabled={disabled || !chat.input.trim()}>Send</button>
</form>
