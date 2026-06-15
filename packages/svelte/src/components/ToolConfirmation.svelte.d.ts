import type { Component } from 'svelte'
import type { ToolCall } from '@agentskit/core'

declare const ToolConfirmation: Component<{
  toolCall: ToolCall
  onApprove: (toolCallId: string) => void
  onDeny: (toolCallId: string, reason?: string) => void
}>
export default ToolConfirmation
