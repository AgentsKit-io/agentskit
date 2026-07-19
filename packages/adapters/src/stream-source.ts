import type { StreamChunk, StreamSource } from '@agentskit/core'
import { adapterErrorChunk, cancelBody, isAbortError } from './stream-errors'
import type { StreamParser } from './stream-types'
import { fetchWithRetry, type RetryOptions } from './utils'

export function createStreamSource(
  doFetch: (signal: AbortSignal) => Promise<Response>,
  parse: StreamParser,
  errorLabel: string,
  retry?: RetryOptions,
): StreamSource {
  let abortController: AbortController | null = new AbortController()

  return {
    stream: async function* (): AsyncIterableIterator<StreamChunk> {
      const controller = abortController
      if (!controller) return
      try {
        const response = await fetchWithRetry(doFetch, controller.signal, retry ?? {})

        if (!response.ok) {
          await cancelBody(response.body)
          yield adapterErrorChunk(`${errorLabel} error: ${response.status}`)
          return
        }

        if (!response.body) {
          yield adapterErrorChunk(`${errorLabel} error: empty response body`)
          return
        }

        for await (const chunk of parse(response.body, response)) {
          if (controller.signal.aborted || abortController === null) return
          yield chunk
        }
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted || abortController === null) return
        const message = err instanceof Error ? err.message : String(err)
        yield adapterErrorChunk(message, { cause: err })
      }
    },
    abort: () => {
      abortController?.abort()
      abortController = null
    },
  }
}
