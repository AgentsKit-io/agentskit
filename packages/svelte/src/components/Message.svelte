<script lang="ts">
  import type { Message as MessageType } from '@agentskit/core'
  import type { Snippet } from 'svelte'

  let {
    message,
    avatar,
    actions,
  }: { message: MessageType; avatar?: Snippet; actions?: Snippet } = $props()
</script>

<div data-ak-message data-ak-role={message.role} data-ak-status={message.status}>
  {#if avatar}<div data-ak-avatar>{@render avatar()}</div>{/if}
  <div data-ak-content>{message.content}</div>
  {#if actions}<div data-ak-actions>{@render actions()}</div>{/if}
</div>
