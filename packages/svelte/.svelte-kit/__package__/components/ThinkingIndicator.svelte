<script lang="ts">
  let { visible, label = 'Thinking...' }: { visible: boolean; label?: string } = $props()
</script>

{#if visible}
  <div data-ak-thinking>
    <span data-ak-thinking-dots><span>•</span><span>•</span><span>•</span></span>
    <span data-ak-thinking-label>{label}</span>
  </div>
{/if}
