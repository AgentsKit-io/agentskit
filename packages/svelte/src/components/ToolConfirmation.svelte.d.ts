import type { Component } from 'svelte'
import type { ToolCall } from '@agentskit/core'

/** Show approval controls while a tool call requires confirmation. */
declare const ToolConfirmation: Component<{
  toolCall: ToolCall
  onApprove: (toolCallId: string) => void
  onDeny: (toolCallId: string, reason?: string) => void
}>
export default ToolConfirmation
