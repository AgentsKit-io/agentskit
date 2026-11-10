import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import { createCassette } from './cassette'
import { defensiveSnapshot } from './clone'
import type { Cassette, RecordOptions } from './types'

/** Adapter factory and cassette populated by {@link createRecordingAdapter}. */
export interface RecordingAdapter {
  factory: AdapterFactory
  cassette: Cassette
}

/** Wrap an adapter factory and record each request's streamed chunks in a cassette.
 *
 * @param base Adapter factory whose requests should be recorded.
 * @param options Optional cassette seed and metadata.
 * @returns A recording factory and the cassette it populates.
 * @example
 * ```ts
 * const recording = createRecordingAdapter(adapter)
 * // Pass recording.factory to a runtime, then save recording.cassette.
 * ```
 */
export function createRecordingAdapter(
  base: AdapterFactory,
  options: RecordOptions = {},
): RecordingAdapter {
  const cassette = createCassette({ seed: options.seed, metadata: options.metadata })

  const factory: AdapterFactory = {
    capabilities: base.capabilities,
    createSource: (request: AdapterRequest): StreamSource => {
      const recordedRequest = defensiveSnapshot(request)
      const source = base.createSource(request)
      const recorded: StreamChunk[] = []
      let aborted = false
      cassette.entries.push({
        request: recordedRequest,
        chunks: recorded,
      })

      return {
        abort: () => {
          if (aborted) return
          aborted = true
          try {
            source.abort()
          } catch {
            // Adapter abort is a safe boundary; recording must preserve it.
          }
        },
        stream: async function* () {
          for await (const chunk of source.stream()) {
            recorded.push(defensiveSnapshot(chunk))
            yield chunk
          }
        },
      }
    },
  }

  return { factory, cassette }
}
