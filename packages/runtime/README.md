# @agentskit/runtime

Run autonomous agents in 5 lines — no UI, no boilerplate, just results.

[![npm version](https://img.shields.io/npm/v/@agentskit/runtime?color=blue)](https://www.npmjs.com/package/@agentskit/runtime)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/runtime)](https://www.npmjs.com/package/@agentskit/runtime)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/runtime)](https://bundlephobia.com/package/@agentskit/runtime)
[![license](https://img.shields.io/npm/l/@agentskit/runtime)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-stable-brightgreen)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/EmersonBraun/agentskit?style=social)](https://github.com/EmersonBraun/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `openai` · `anthropic` · `ai-agents` · `autonomous-agents` · `react-loop` · `orchestration` · `multi-agent`

## Why runtime

- **ReAct loop handled for you** — observe, think, act, repeat: the runtime drives the full cycle and stops when the agent decides it's done
- **Structured, inspectable results** — every run returns the final content, step count, all tool calls made, and total duration; no black boxes
- **Production-ready lifecycle** — lazy tool `init`/`dispose`, `AbortSignal` cancellation, memory persistence, and `AgentEvent` emissions for observability
- **Multi-agent delegation** — pass a `planner` skill with named delegates and the runtime coordinates sub-agents automatically

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

## Features

- `createRuntime` — single entry point for headless agent execution
- ReAct loop: observe → think → act → repeat until done
- Returns `{ content, steps, toolCalls, durationMs }` — fully inspectable
- `AbortSignal` cancellation support
- Tool `init` / `dispose` lifecycle hooks
- `AgentEvent` emissions for observability integrations
- `retriever` option for RAG context injection

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `createRuntime` contracts, `Retriever` |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM adapters |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Tool modules |
| [@agentskit/skills](https://www.npmjs.com/package/@agentskit/skills) | Pre-built skills |
| [@agentskit/rag](https://www.npmjs.com/package/@agentskit/rag) | `retriever` for context injection |

## Contributors

<a href="https://github.com/EmersonBraun/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=EmersonBraun/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/EmersonBraun/agentskit)
