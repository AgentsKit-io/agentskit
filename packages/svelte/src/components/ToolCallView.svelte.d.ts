import type { Component } from 'svelte'
import type { ToolCall } from '@agentskit/core'

/** Show a tool call summary with expandable arguments and result details. */
declare const ToolCallView: Component<{ toolCall: ToolCall }>
export default ToolCallView
