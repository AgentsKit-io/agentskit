import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createChatController } from '@agentskit/core'
import type { ChatConfig, ChatController, ChatReturn } from '@agentskit/core'

/**
 * React Native / Expo `useChat`. Identical contract to
 * `@agentskit/react` — imported from a pure-React module so it stays
 * Metro / Hermes safe (no DOM).
 */
export function useChat(config: ChatConfig): ChatReturn {
  const controllerRef = useRef<ChatController | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = createChatController(config)
  }

  useEffect(() => {
    controllerRef.current?.updateConfig(config)
  }, [config])

  useEffect(() => () => controllerRef.current?.stop(), [])

  const state = useSyncExternalStore(
    controllerRef.current.subscribe,
    controllerRef.current.getState,
    controllerRef.current.getState,
  )

  return {
    ...state,
    send: controllerRef.current.send,
    stop: controllerRef.current.stop,
    retry: controllerRef.current.retry,
    edit: controllerRef.current.edit,
    regenerate: controllerRef.current.regenerate,
    setInput: controllerRef.current.setInput,
    clear: controllerRef.current.clear,
    proposeToolCall: controllerRef.current.proposeToolCall,
    approve: controllerRef.current.approve,
    deny: controllerRef.current.deny,
  }
}
