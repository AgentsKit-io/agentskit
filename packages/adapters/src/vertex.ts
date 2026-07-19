import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { parseGeminiStream, type RetryOptions } from './utils'
import { createStreamSource } from './stream-source'
import { toGeminiContents } from './tool-history'

export interface VertexConfig {
  /** GCP project id. */
  project: string
  /** Region, e.g. `us-central1`. */
  region: string
  /** Vertex model id, e.g. `gemini-2.5-pro`. */
  model: string
  /**
   * OAuth2 access token, or a function returning one (called per request).
   *
   * Use the `google-auth-library` (or `gcloud auth print-access-token`) to
   * mint these — the adapter intentionally doesn't take that as a hard dep.
   */
  accessToken: string | (() => string | Promise<string>)
  /** Override the publisher (defaults to `google`; set for partner publishers). */
  publisher?: string
  retry?: RetryOptions
}

export function vertex(config: VertexConfig): AdapterFactory {
  const { project, region, model, accessToken, publisher = 'google', retry } = config
  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/${publisher}/models/${model}:streamGenerateContent?alt=sse`

  return {
    capabilities: {
      streaming: true,
      tools: true,
      multiModal: true,
      usage: true,
      reasoning: model.includes('pro'),
    },
    createSource: (request: AdapterRequest): StreamSource => {
      const systemMessage = request.messages.find(message => message.role === 'system')
      const body = {
        contents: toGeminiContents(request.messages),
        systemInstruction: systemMessage
          ? { role: 'system', parts: [{ text: systemMessage.content }] }
          : undefined,
        tools: request.context?.tools && request.context.tools.length > 0
          ? [{
              functionDeclarations: request.context.tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.schema,
              })),
            }]
          : undefined,
      }

      return createStreamSource(
        async (signal) => {
          const token = typeof accessToken === 'string' ? accessToken : await accessToken()
          return fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal,
          })
        },
        parseGeminiStream,
        'Vertex AI',
        retry,
      )
    },
  }
}

export const vertexAdapter = vertex
