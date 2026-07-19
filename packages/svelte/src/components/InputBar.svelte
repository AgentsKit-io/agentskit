<script lang="ts">
  import type { ChatReturn } from '@agentskit/core'

  let {
    chat,
    placeholder = 'Type a message...',
    disabled = false,
  }: { chat: ChatReturn; placeholder?: string; disabled?: boolean } = $props()

  const blocked = $derived(disabled || chat.status === 'streaming')

  function submit() {
    if (blocked || !chat.input.trim()) return
    void chat.send(chat.input)
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
    data-ak-input
    rows="1"
    {placeholder}
    disabled={blocked}
    value={chat.input}
    oninput={(e) => chat.setInput(e.currentTarget.value)}
    onkeydown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    }}
  ></textarea>
  <button data-ak-send type="submit" disabled={blocked || !chat.input.trim()}>Send</button>
</form>
