import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { sandboxTool } from '@agentskit/sandbox'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  tools: [sandboxTool({ apiKey: process.env.E2B_API_KEY })],
})

const result = await runtime.run('Write and run a Python script that generates a Fibonacci sequence up to 100')
console.log(result.content)
