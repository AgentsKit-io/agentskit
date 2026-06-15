import type { Component } from 'svelte'
import type { ChatReturn } from '@agentskit/core'

declare const InputBar: Component<{
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}>
export default InputBar
