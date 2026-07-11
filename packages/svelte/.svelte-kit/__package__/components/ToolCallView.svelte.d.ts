import type { Component } from 'svelte'
import type { ToolCall } from '@agentskit/core'

declare const ToolCallView: Component<{ toolCall: ToolCall }>
export default ToolCallView
