import { useState, useEffect, useRef, useCallback } from 'react'
import type { StreamSource, StreamChunk, StreamStatus, UseStreamOptions, UseStreamReturn } from '@agentskit/core'

export function useStream(
  source: StreamSource,
  options?: UseStreamOptions
): UseStreamReturn {
  const [data, setData] = useState<StreamChunk | null>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const sourceRef = useRef(source)
  const optionsRef = useRef(options)
  const abortedRef = useRef(false)

  sourceRef.current = source
  optionsRef.current = options

  useEffect(() => {
    let cancelled = false
    const activeSource = source
    abortedRef.current = false
    setStatus('streaming')
    setText('')
    setData(null)
    setError(null)

    let accumulated = ''

    const consume = async () => {
      try {
        const iterator = activeSource.stream()
        for await (const chunk of iterator) {
          if (cancelled || abortedRef.current) return

          setData(chunk)
          optionsRef.current?.onChunk?.(chunk)

          if (chunk.type === 'text' && chunk.content) {
            accumulated += chunk.content
            setText(accumulated)
          } else if (chunk.type === 'error') {
            const err = new Error(chunk.content ?? 'Stream error')
            setError(err)
            setStatus('error')
            optionsRef.current?.onError?.(err)
            return
          } else if (chunk.type === 'done') {
            setStatus('complete')
            optionsRef.current?.onComplete?.(accumulated)
            return
          }
        }

        if (!cancelled && !abortedRef.current) {
          setStatus('complete')
          optionsRef.current?.onComplete?.(accumulated)
        }
      } catch (err) {
        if (!cancelled && !abortedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)
          setStatus('error')
          optionsRef.current?.onError?.(error)
        }
      }
    }

    consume()

    return () => {
      cancelled = true
      activeSource.abort()
    }
  }, [source])

  const stop = useCallback(() => {
    abortedRef.current = true
    sourceRef.current.abort()
  }, [])

  return { data, text, status, error, stop }
}
