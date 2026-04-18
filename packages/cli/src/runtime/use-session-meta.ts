import { useEffect, useRef } from 'react'
import type { Message as ChatMessage } from '@agentskit/core'
import { derivePreview, writeSessionMeta } from '../sessions'

export interface UseSessionMetaOptions {
  sessionId?: string
  messages: ChatMessage[]
  provider: string
  model?: string
}

export function useSessionMeta(options: UseSessionMetaOptions) {
  const sessionCreatedAtRef = useRef<string | undefined>(undefined)
  const messageCount = options.messages.length
  const firstUserContent = options.messages.find(m => m.role === 'user')?.content ?? ''

  useEffect(() => {
    const sessionId = options.sessionId
    if (!sessionId || sessionId === 'custom') return
    if (!sessionCreatedAtRef.current) {
      sessionCreatedAtRef.current = new Date().toISOString()
    }
    try {
      writeSessionMeta({
        id: sessionId,
        cwd: process.cwd(),
        createdAt: sessionCreatedAtRef.current,
        updatedAt: new Date().toISOString(),
        messageCount,
        preview: derivePreview(options.messages),
        provider: options.provider,
        model: options.model,
      })
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.sessionId, messageCount, firstUserContent, options.provider, options.model])
}
