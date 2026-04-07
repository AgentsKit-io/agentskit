# @agentskit/runtime

Run autonomous agents in 5 lines — no UI, no boilerplate, just results.

## Why

- **ReAct loop handled for you** — observe, think, act, repeat: the runtime drives the full cycle and stops when the agent decides it's done
- **Structured, inspectable results** — every run returns the final content, step count, all tool calls made, and total duration; no black boxes
- **Production-ready lifecycle** — lazy tool `init`/`dispose`, `AbortSignal` cancellation, memory persistence, and `AgentEvent` emissions for observability

## Install

```bash
npm install @agentskit/runtime @agentskit/adapters
```

## Quick example

```ts
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
```

## With skills

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { researcher } from '@agentskit/skills'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
})

const result = await runtime.run('Summarize REST vs GraphQL', { skill: researcher })
console.log(result.content)
```

## Next steps

- Add **RAG**: pass `retriever` from [`@agentskit/rag`](https://www.npmjs.com/package/@agentskit/rag) — see [`@agentskit/rag` README](https://www.npmjs.com/package/@agentskit/rag)
- Add **observability** with [`@agentskit/observability`](https://www.npmjs.com/package/@agentskit/observability) `observers` for LangSmith or OpenTelemetry

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `createRuntime` contracts, `Retriever` |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM adapters |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Tool modules |
| [@agentskit/skills](https://www.npmjs.com/package/@agentskit/skills) | Pre-built skills |
| [@agentskit/rag](https://www.npmjs.com/package/@agentskit/rag) | `retriever` for context injection |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
