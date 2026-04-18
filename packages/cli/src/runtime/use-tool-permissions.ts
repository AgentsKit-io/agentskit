import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatReturn } from '@agentskit/core'

export function useToolPermissions(chat: ChatReturn) {
  const [sessionAllowed, setSessionAllowed] = useState<Set<string>>(new Set())
  const autoApprovedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (sessionAllowed.size === 0) return
    for (const message of chat.messages) {
      for (const call of message.toolCalls ?? []) {
        if (
          call.status === 'requires_confirmation' &&
          sessionAllowed.has(call.name) &&
          !autoApprovedRef.current.has(call.id)
        ) {
          autoApprovedRef.current.add(call.id)
          void chat.approve(call.id)
        }
      }
    }
  }, [chat.messages, sessionAllowed, chat.approve])

  const handleApproveAlways = (toolCallId: string, toolName: string) => {
    setSessionAllowed(prev => {
      if (prev.has(toolName)) return prev
      const next = new Set(prev)
      next.add(toolName)
      return next
    })
    autoApprovedRef.current.add(toolCallId)
    void chat.approve(toolCallId)
  }

  const awaitingConfirmation = useMemo(
    () =>
      chat.messages.some(message =>
        message.toolCalls?.some(
          call => call.status === 'requires_confirmation' && !sessionAllowed.has(call.name),
        ),
      ),
    [chat.messages, sessionAllowed],
  )

  return { sessionAllowed, handleApproveAlways, awaitingConfirmation }
}
