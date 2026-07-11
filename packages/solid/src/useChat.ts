import { createStore } from 'solid-js/store'
import { onCleanup } from 'solid-js'
import { createChatController } from '@agentskit/core'
import type { ChatConfig, ChatReturn, ChatState } from '@agentskit/core'

/**
 * Solid hook — returns a reactive chat state + controller actions.
 */
export function useChat(config: ChatConfig): ChatReturn {
  const controller = createChatController(config)
  const [state, setState] = createStore<ChatState>(controller.getState())
  const unsubscribe = controller.subscribe(() => setState(controller.getState()))
  onCleanup(() => unsubscribe())

  return new Proxy(
    {
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
    },
    {
      get(target, prop: string) {
        if (prop in target) return (target as Record<string, unknown>)[prop]
        return (state as unknown as Record<string, unknown>)[prop]
      },
    },
  ) as unknown as ChatReturn
}
