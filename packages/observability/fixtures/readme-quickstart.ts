import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { consoleLogger, langsmith } from '@agentskit/observability'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  observers: [
    consoleLogger({ format: 'pretty' }),
    langsmith({ apiKey: process.env.LANGSMITH_API_KEY }),
  ],
})

const result = await runtime.run('Analyze sales data in ./data/sales.csv')
// Every step is now logged and traced automatically
