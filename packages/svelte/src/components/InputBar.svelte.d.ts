import type { Component } from 'svelte'
import type { ChatReturn } from '@agentskit/core'

/** Render a chat textarea and submit control bound to a Svelte chat store. */
declare const InputBar: Component<{
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}>
export default InputBar
