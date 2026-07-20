import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { parseGeminiStream, type RetryOptions } from './utils'
import { createStreamSource } from './stream-source'
import { toGeminiContents } from './tool-history'

export interface GeminiConfig {
  apiKey: string
  model: string
  baseUrl?: string
  retry?: RetryOptions
}

export function gemini(config: GeminiConfig): AdapterFactory {
  const { apiKey, model, baseUrl = 'https://generativelanguage.googleapis.com', retry } = config

  return {
    capabilities: {
      streaming: true,
      tools: true,
      multiModal: true,
      usage: true,
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
        (signal) => fetch(
          `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(body),
            signal,
          },
        ),
        parseGeminiStream,
        'Gemini API',
        retry,
      )
    },
  }
}
