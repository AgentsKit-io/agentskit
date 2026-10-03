import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import { parseSSE, readJson } from '@agentskit/net'
import { adapterErrorChunk, isAbortError } from './stream-errors'

/**
 * Configuration options for the Replicate chat adapter.
 */
export interface ReplicateConfig {
  apiKey: string
  /** Replicate model id, e.g. `meta/meta-llama-3-70b-instruct`. */
  model: string
  /** Optional pinned version hash (for non-official models). */
  version?: string
  /** Override the prediction endpoint base. */
  baseUrl?: string
  /** Map AdapterRequest → Replicate `input` object. Defaults to `{ prompt }`. */
  toInput?: (request: AdapterRequest) => Record<string, unknown>
}

const DEFAULT_BASE_URL = 'https://api.replicate.com'
const MAX_PREDICTION_RESPONSE_BYTES = 64 * 1024

function defaultPrompt(request: AdapterRequest): string {
  return request.messages
    .map(m => {
      if (m.role === 'system') return `[SYSTEM] ${m.content}`
      if (m.role === 'assistant') return `[ASSISTANT] ${m.content}`
      return `[USER] ${m.content}`
    })
    .join('\n\n') + '\n\n[ASSISTANT] '
}

interface PredictionResponse {
  id: string
  urls?: { stream?: string; cancel?: string }
  error?: string
}

async function* parseReplicateStream(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncIterableIterator<StreamChunk> {
  let sawDone = false
  for await (const { event, data } of parseSSE(stream, { signal })) {
    if (event === 'output' && data) yield { type: 'text', content: data }
    else if (event === 'done') {
      sawDone = true
      yield { type: 'done' }
      return
    } else if (event === 'error') {
      yield adapterErrorChunk(data || 'replicate stream error')
      return
    }
  }
  if (!sawDone) yield adapterErrorChunk('Replicate stream ended without done event')
}

/**
 * Creates an adapter for Replicate streaming predictions.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 *
 * @example
 * const adapter = replicate({ apiKey: '…', model: 'model-name' })
 */
export function replicate(config: ReplicateConfig): AdapterFactory {
  const { apiKey, model, version, baseUrl = DEFAULT_BASE_URL, toInput = (r) => ({ prompt: defaultPrompt(r) }) } = config

  const predictionUrl = version
    ? `${baseUrl}/v1/predictions`
    : `${baseUrl}/v1/models/${model}/predictions`

  return {
    capabilities: {
      streaming: true,
      tools: false,
    },
    createSource: (request: AdapterRequest): StreamSource => {
      const controller = new AbortController()
      let aborted = false

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (aborted) return
          try {
            const body: Record<string, unknown> = {
              input: toInput(request),
              stream: true,
            }
            if (version) body.version = version

            const response = await fetch(predictionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify(body),
              signal: controller.signal,
            })

            if (!response.ok) {
              yield adapterErrorChunk(`Replicate API error: ${response.status}`)
              return
            }

            const prediction = await readJson<PredictionResponse>(response, {
              maxBytes: MAX_PREDICTION_RESPONSE_BYTES,
            })
            if (prediction.error) {
              yield adapterErrorChunk(prediction.error)
              return
            }
            const streamUrl = prediction.urls?.stream
            if (!streamUrl) {
              yield adapterErrorChunk('Replicate prediction has no stream URL')
              return
            }

            const streamResponse = await fetch(streamUrl, {
              method: 'GET',
              headers: { Accept: 'text/event-stream' },
              signal: controller.signal,
            })
            if (!streamResponse.ok || !streamResponse.body) {
              yield adapterErrorChunk(`Replicate stream error: ${streamResponse.status}`)
              return
            }

            for await (const chunk of parseReplicateStream(streamResponse.body, controller.signal)) {
              if (aborted) return
              yield chunk
            }
          } catch (err) {
            if (isAbortError(err) || aborted) return
            const message = err instanceof Error ? err.message : String(err)
            yield adapterErrorChunk(message, { cause: err })
          }
        },
        abort: () => {
          aborted = true
          controller.abort()
        },
      }
    },
  }
}

/**
 * Creates an adapter for Replicate streaming predictions.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 */
export const replicateAdapter = replicate
