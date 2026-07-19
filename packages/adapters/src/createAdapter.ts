import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import type { CreateAdapterConfig } from './types'
import { adapterErrorChunk, isAbortError, raceAbort } from './stream-errors'

export function createAdapter(config: CreateAdapterConfig): AdapterFactory {
  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const controller = new AbortController()
      let activeStream: ReadableStream | null = null
      let parseIter: AsyncIterator<StreamChunk> | null = null

      const cleanup = (): void => {
        try {
          void activeStream?.cancel()
        } catch {
          // ignore
        }
        activeStream = null
        if (parseIter && typeof parseIter.return === 'function') {
          void parseIter.return(undefined).catch(() => {})
        }
        parseIter = null
        try {
          config.abort?.()
        } catch {
          // ignore
        }
      }

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (controller.signal.aborted) return
          try {
            const result = await raceAbort(config.send(request, controller.signal), controller.signal)
            if (controller.signal.aborted) {
              if (result instanceof Response) {
                try {
                  await result.body?.cancel()
                } catch {
                  // ignore
                }
              }
              return
            }

            const stream =
              result instanceof Response
                ? result.body
                : result
            if (!stream) {
              yield adapterErrorChunk('Adapter send() returned empty body')
              return
            }
            activeStream = stream

            const response = result instanceof Response ? result : undefined
            const iterable = config.parse(stream, response)
            parseIter = iterable[Symbol.asyncIterator]()

            while (true) {
              if (controller.signal.aborted) {
                cleanup()
                return
              }
              let next: IteratorResult<StreamChunk>
              try {
                next = await raceAbort(parseIter.next(), controller.signal)
              } catch (err) {
                if (isAbortError(err) || controller.signal.aborted) {
                  cleanup()
                  return
                }
                throw err
              }
              if (next.done) break
              if (controller.signal.aborted) {
                cleanup()
                return
              }
              yield next.value
              if (next.value.type === 'done' || next.value.type === 'error') {
                if (typeof parseIter.return === 'function') {
                  await parseIter.return(undefined).catch(() => {})
                }
                parseIter = null
                activeStream = null
                return
              }
            }
            yield adapterErrorChunk('Adapter parser ended without a terminal chunk')
            activeStream = null
          } catch (err) {
            if (isAbortError(err) || controller.signal.aborted) return
            const message = err instanceof Error ? err.message : String(err)
            yield adapterErrorChunk(message, { cause: err })
          } finally {
            if (controller.signal.aborted) cleanup()
          }
        },
        abort: () => {
          if (!controller.signal.aborted) controller.abort()
          cleanup()
        },
      }
    },
  }
}
