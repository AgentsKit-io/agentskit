import type { Component, Snippet } from 'svelte'
import type { Message as MessageType } from '@agentskit/core'

declare const Message: Component<{
  message: MessageType
  avatar?: Snippet
  actions?: Snippet
}>
export default Message
