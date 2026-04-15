import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { createStreamSource, parseGeminiStream, type RetryOptions } from './utils'

export interface GeminiConfig {
  apiKey: string
  model: string
  baseUrl?: string
  retry?: RetryOptions
}

export function gemini(config: GeminiConfig): AdapterFactory {
  const { apiKey, model, baseUrl = 'https://generativelanguage.googleapis.com', retry } = config

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const body = {
        contents: request.messages
          .filter(message => message.role !== 'system')
          .map(message => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }],
          })),
        systemInstruction: request.messages.find(message => message.role === 'system')
          ? {
              role: 'system',
              parts: [{ text: request.messages.find(message => message.role === 'system')!.content }],
            }
          : undefined,
      }

      return createStreamSource(
        (signal) => fetch(
          `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
