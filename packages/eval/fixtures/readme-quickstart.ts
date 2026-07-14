import { runEval } from '@agentskit/eval'
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})

const result = await runEval({
  agent: async (input) => {
    const r = await runtime.run(input)
    return r.content
  },
  suite: {
    name: 'qa-baseline',
    cases: [
      { input: 'What is 2+2?', expected: '4' },
      { input: 'Capital of France?', expected: 'Paris' },
      { input: 'Is TypeScript a superset of JavaScript?', expected: (r) => r.toLowerCase().includes('yes') },
    ],
  },
})

console.log(`Accuracy: ${(result.accuracy * 100).toFixed(1)}%`)
console.log(`Passed: ${result.passed}/${result.totalCases}`)
