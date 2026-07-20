import { writable, type Readable } from 'svelte/store'
import { createChatController } from '@agentskit/core'
import type { ChatConfig, ChatController, ChatReturn, ChatState } from '@agentskit/core'

export interface SvelteChatStore extends Readable<ChatState> {
  send: ChatController['send']
  stop: ChatController['stop']
  retry: ChatController['retry']
  edit: ChatController['edit']
  regenerate: ChatController['regenerate']
  setInput: ChatController['setInput']
  clear: ChatController['clear']
  proposeToolCall: ChatReturn['proposeToolCall']
  approve: ChatController['approve']
  deny: ChatController['deny']
  destroy: () => void
}

/**
 * Svelte 5 store. Same shape as `@agentskit/react`'s hook return,
 * exposed as a `Readable<ChatState>` + action methods.
 */
export function createChatStore(config: ChatConfig): SvelteChatStore {
  const controller = createChatController(config)
  const store = writable<ChatState>(controller.getState())
  const unsubscribe = controller.subscribe(() => store.set(controller.getState()))
  let destroyed = false

  const destroy = (): void => {
    if (destroyed) return
    destroyed = true
    unsubscribe()
    controller.stop()
  }

  return {
    subscribe: store.subscribe,
    send: controller.send,
    stop: controller.stop,
    retry: controller.retry,
    edit: controller.edit,
    regenerate: controller.regenerate,
    setInput: controller.setInput,
    clear: controller.clear,
    proposeToolCall: controller.proposeToolCall,
    approve: controller.approve,
    deny: controller.deny,
    destroy,
  }
}
