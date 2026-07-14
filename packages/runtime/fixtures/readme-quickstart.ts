import { createRuntime } from '@agentskit/runtime'
import { openai } from '@agentskit/adapters'
import { webSearch, filesystem } from '@agentskit/tools'

const runtime = createRuntime({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }),
  tools: [webSearch(), ...filesystem({ basePath: './workspace' })],
  systemPrompt: 'You are a helpful research assistant.',
})

const result = await runtime.run('Research the latest advances in quantum computing')
console.log(result.content)
console.log(`Completed in ${result.steps} steps, ${result.durationMs}ms`)
