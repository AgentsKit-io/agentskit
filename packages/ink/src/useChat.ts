// NOTE: This hook is identical in @agentskit/react and @agentskit/ink.
// Changes here must be mirrored in packages/react/src/useChat.ts.
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createChatController } from '@agentskit/core'
import type { ChatConfig, ChatController, ChatReturn } from '@agentskit/core'

export function useChat(config: ChatConfig): ChatReturn {
  const controllerRef = useRef<ChatController | null>(null)

  if (!controllerRef.current) {
    controllerRef.current = createChatController(config)
  }

  useEffect(() => {
    controllerRef.current?.updateConfig(config)
  }, [config])

  const state = useSyncExternalStore(
    controllerRef.current.subscribe,
    controllerRef.current.getState,
    controllerRef.current.getState
  )

  return {
    ...state,
    send: controllerRef.current.send,
    stop: controllerRef.current.stop,
    retry: controllerRef.current.retry,
    setInput: controllerRef.current.setInput,
    clear: controllerRef.current.clear,
  }
}
