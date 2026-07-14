import { anthropic, openai, ollama } from '@agentskit/adapters'
import { createRuntime } from '@agentskit/runtime'

// Switch provider by swapping one import
const adapter = anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' })
// const adapter = openai({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' })
// const adapter = ollama({ model: 'llama3.1' })

const runtime = createRuntime({ adapter })
const result = await runtime.run('Summarize the latest AI news')
console.log(result.content)
