import { createChatController, createInMemoryMemory } from '@agentskit/core'
import { anthropic } from '@agentskit/adapters'

const controller = createChatController({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  memory: createInMemoryMemory(),
})

await controller.send('Hello!')
console.log(controller.getState().messages)
