<script lang="ts">
  import type { ToolCall } from '@agentskit/core'

  let {
    toolCall,
    onApprove,
    onDeny,
  }: {
    toolCall: ToolCall
    onApprove: (toolCallId: string) => void
    onDeny: (toolCallId: string, reason?: string) => void
  } = $props()
</script>

{#if toolCall.status === 'requires_confirmation'}
  <div data-ak-tool-confirmation data-ak-tool-name={toolCall.name}>
    <div data-ak-tool-confirmation-header>
      <span data-ak-tool-confirmation-name>{toolCall.name}</span>
      <span data-ak-tool-confirmation-status>requires confirmation</span>
    </div>
    <div data-ak-tool-confirmation-args>{JSON.stringify(toolCall.args, null, 2)}</div>
    <div data-ak-tool-confirmation-actions>
      <button data-ak-tool-confirmation-approve type="button" onclick={() => onApprove(toolCall.id)}>
        Approve
      </button>
      <button data-ak-tool-confirmation-deny type="button" onclick={() => onDeny(toolCall.id)}>
        Deny
      </button>
    </div>
  </div>
{/if}
