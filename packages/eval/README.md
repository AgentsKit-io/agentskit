# @agentskit/eval

Agent evaluation and benchmarking for [AgentsKit](https://github.com/EmersonBraun/agentskit).

## Install

```bash
npm install @agentskit/eval
```

## Quick example

```ts
import { runEval } from '@agentskit/eval'
import { createRuntime } from '@agentskit/runtime'

const runtime = createRuntime({ adapter, tools: [...] })

const result = await runEval({
  agent: async (input) => {
    const r = await runtime.run(input)
    return r.content
  },
  suite: {
    name: 'basic-qa',
    cases: [
      { input: 'What is 2+2?', expected: '4' },
      { input: 'Capital of France?', expected: 'Paris' },
      { input: 'Is water wet?', expected: (r) => r.toLowerCase().includes('yes') },
    ],
  },
})

console.log(`Accuracy: ${(result.accuracy * 100).toFixed(1)}%`)
console.log(`Passed: ${result.passed}/${result.totalCases}`)

for (const r of result.results) {
  console.log(`${r.passed ? 'PASS' : 'FAIL'} [${r.latencyMs}ms] ${r.input}`)
}
```

## With token usage

```ts
const result = await runEval({
  agent: async (input) => {
    const r = await runtime.run(input)
    return { content: r.content, tokenUsage: { prompt: 100, completion: 20 } }
  },
  suite,
})
```

## Comparison logic

- **String expected**: uses `includes` (LLM output often wraps the answer)
- **Function expected**: full control — `(result) => boolean`

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
