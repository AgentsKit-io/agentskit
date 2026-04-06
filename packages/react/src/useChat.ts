// NOTE: This hook is intentionally duplicated in @agentskit/ink (packages/ink/src/useChat.ts).
// The two packages are React siblings and cannot cross-depend, so the hook is kept in sync
// manually. A sync-guard test at packages/ink/tests/useChat-sync.test.ts will fail if they drift.
// When changing this file, mirror the same change in packages/ink/src/useChat.ts.
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
