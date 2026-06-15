<script lang="ts">
  import type { ToolCall } from '@agentskit/core'

  let { toolCall }: { toolCall: ToolCall } = $props()
  let expanded = $state(false)
</script>

<div data-ak-tool-call data-ak-tool-status={toolCall.status}>
  <button data-ak-tool-toggle type="button" onclick={() => (expanded = !expanded)}>
    {toolCall.name}
  </button>
  {#if expanded}
    <div data-ak-tool-details>
      <pre data-ak-tool-args>{JSON.stringify(toolCall.args, null, 2)}</pre>
      {#if toolCall.result}<div data-ak-tool-result>{toolCall.result}</div>{/if}
    </div>
  {/if}
</div>
