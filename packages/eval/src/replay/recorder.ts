import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import { createCassette } from './cassette'
import type { Cassette, RecordOptions } from './types'

export interface RecordingAdapter {
  factory: AdapterFactory
  cassette: Cassette
}

/**
 * Wrap an existing AdapterFactory. All streamed chunks are recorded into
 * a fresh Cassette so the session can be replayed deterministically.
 */
export function createRecordingAdapter(
  base: AdapterFactory,
  options: RecordOptions = {},
): RecordingAdapter {
  const cassette = createCassette({ seed: options.seed, metadata: options.metadata })

  const factory: AdapterFactory = {
    capabilities: base.capabilities,
    createSource: (request: AdapterRequest): StreamSource => {
      const source = base.createSource(request)
      const recorded: StreamChunk[] = []
      cassette.entries.push({ request, chunks: recorded })

      return {
        abort: source.abort,
        stream: async function* () {
          for await (const chunk of source.stream()) {
            recorded.push(chunk)
            yield chunk
          }
        },
      }
    },
  }

  return { factory, cassette }
}
