import { defineAction } from '../../contract'

interface AzureOpenAIRuntimeConfig {
  deployment: string
  apiVersion?: string
}

export const azureOpenaiChat = defineAction({
  name: 'azure_openai_chat',
  description: 'Create a chat completion against an Azure OpenAI deployment.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      messages: { type: 'array', items: { type: 'object' }, description: 'OpenAI-format chat messages.' },
      temperature: { type: 'number' },
      max_tokens: { type: 'number' },
    },
    required: ['messages'],
  },
  async execute(args, { http, config }) {
    const cfg = config as AzureOpenAIRuntimeConfig
    const result = await http<{ choices?: Array<{ message?: { role: string; content: string } }>; usage?: Record<string, number> }>({
      method: 'POST',
      path: `/openai/deployments/${cfg.deployment}/chat/completions`,
      query: { 'api-version': cfg.apiVersion ?? '2024-10-21' },
      body: { messages: args.messages, temperature: args.temperature, max_tokens: args.max_tokens },
    })
    return { message: result.choices?.[0]?.message, usage: result.usage }
  },
})

export const azureOpenaiActions = [azureOpenaiChat]
