import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import type { GenericAdapterConfig } from './types'
import { isAbortError, raceAbort } from './stream-errors'

export function generic(config: GenericAdapterConfig): AdapterFactory {
  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const controller = new AbortController()
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
      const decoder = new TextDecoder()

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (controller.signal.aborted) return
          try {
            const stream = await raceAbort(
              config.send(request, controller.signal),
              controller.signal,
            )
            if (controller.signal.aborted) {
              try {
                await stream.cancel()
              } catch {
                // ignore
              }
              return
            }
            reader = stream.getReader()

            while (true) {
              if (controller.signal.aborted) {
                try {
                  await reader.cancel()
                } catch {
                  // ignore
                }
                return
              }
              const { done, value } = await raceAbort(reader.read(), controller.signal)
              if (done) break
              const text = decoder.decode(value, { stream: true })
              yield { type: 'text', content: text }
            }

            if (controller.signal.aborted) return
            yield { type: 'done' }
          } catch (err) {
            if (isAbortError(err) || controller.signal.aborted) return
            yield {
              type: 'error',
              content: err instanceof Error ? err.message : String(err),
              metadata: {
                error: err instanceof Error ? err : new Error(String(err)),
              },
            }
          } finally {
            try {
              reader?.releaseLock()
            } catch {
              // ignore
            }
          }
        },
        abort: () => {
          if (!controller.signal.aborted) controller.abort()
          void reader?.cancel().catch(() => {})
        },
      }
    },
  }
}
