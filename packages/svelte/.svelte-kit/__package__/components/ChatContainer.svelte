<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children?: Snippet } = $props()
  let el: HTMLDivElement | undefined = $state()

  $effect(() => {
    if (!el || typeof MutationObserver === 'undefined') return
    const observer = new MutationObserver(() => {
      if (el) el.scrollTop = el.scrollHeight
    })
    observer.observe(el, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  })
</script>

<div bind:this={el} data-ak-chat-container data-testid="ak-chat-container">
  {@render children?.()}
</div>
