import { writable, type Readable } from 'svelte/store'
import { ConfigError, ErrorCodes, createChatController } from '@agentskit/core'
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

  const ensureAlive = (): void => {
    if (destroyed) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: 'Svelte chat store has been destroyed.',
      })
    }
  }
  const rejected = <A extends unknown[], T>(action: (...args: A) => Promise<T>): ((...args: A) => Promise<T>) =>
    (...args: A) => { try { ensureAlive() } catch (error) { return Promise.reject(error) }; return action(...args) }

  return {
    subscribe: store.subscribe,
    send: rejected((text: string) => controller.send(text)),
    stop: () => { if (!destroyed) controller.stop() },
    retry: rejected(() => controller.retry()),
    edit: rejected((messageId: string, newContent: string, opts?: Parameters<ChatController['edit']>[2]) => controller.edit(messageId, newContent, opts)),
    regenerate: rejected((messageId?: string) => controller.regenerate(messageId)),
    setInput: (value: string) => { if (!destroyed) controller.setInput(value) },
    clear: rejected(() => controller.clear()),
    proposeToolCall: rejected((proposal: Parameters<ChatController['proposeToolCall']>[0]) => controller.proposeToolCall(proposal)),
    approve: rejected((toolCallId: string) => controller.approve(toolCallId)),
    deny: rejected((toolCallId: string, reason?: string) => controller.deny(toolCallId, reason)),
    destroy,
  }
}
