import { defineAction } from '../../contract'

export const openaiImagesGenerate = defineAction({
  name: 'openai_image_generate',
  description: 'Generate an image from a text prompt via the OpenAI Images API.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      size: { type: 'string', description: 'e.g. "1024x1024", "1792x1024", "1024x1792"' },
      n: { type: 'number', description: 'Number of images (default 1)' },
    },
    required: ['prompt'],
  },
  async execute(args, { http, config }) {
    const model = (config as { model?: string } | undefined)?.model ?? 'gpt-image-1'
    const result = await http<{ data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }> }>({
      method: 'POST',
      path: '/images/generations',
      body: { model, prompt: args.prompt, size: args.size ?? '1024x1024', n: (args.n as number) ?? 1 },
    })
    return result.data.map((img) => ({ url: img.url, b64: img.b64_json, revisedPrompt: img.revised_prompt }))
  },
})

export const openaiImagesActions = [openaiImagesGenerate]
