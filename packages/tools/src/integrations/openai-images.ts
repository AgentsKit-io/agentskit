import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface OpenAIImagesConfig extends HttpToolOptions {
  apiKey: string
  /** Default model id. 'gpt-image-1' is the current multimodal image model. */
  model?: string
}

function opts(config: OpenAIImagesConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.openai.com/v1',
    headers: { authorization: `Bearer ${config.apiKey}`, ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function openaiImagesGenerate(config: OpenAIImagesConfig) {
  const base = opts(config)
  return defineTool({
    name: 'openai_image_generate',
    description: 'Generate an image from a text prompt via the OpenAI Images API.',
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        size: { type: 'string', description: 'e.g. "1024x1024", "1792x1024", "1024x1792"' },
        n: { type: 'number', description: 'Number of images (default 1)' },
      },
      required: ['prompt'],
    } as const,
    async execute({ prompt, size, n }) {
      const result = await httpJson<{ data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }> }>(
        base,
        {
          method: 'POST',
          path: '/images/generations',
          body: {
            model: config.model ?? 'gpt-image-1',
            prompt,
            size: size ?? '1024x1024',
            n: n ?? 1,
          },
        },
      )
      return result.data.map(img => ({
        url: img.url,
        b64: img.b64_json,
        revisedPrompt: img.revised_prompt,
      }))
    },
  })
}

export function openaiImages(config: OpenAIImagesConfig) {
  return [openaiImagesGenerate(config)]
}
