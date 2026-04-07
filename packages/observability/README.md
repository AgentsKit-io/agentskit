# @agentskit/observability

See exactly what your agent does — every LLM call, tool execution, and reasoning step — with zero coupling to your agent code.

## Why

- **Debug in minutes, not hours** — trace the full ReAct loop: which tools were called, what the LLM received, where it went wrong, all in one place
- **Works with your existing tracing stack** — LangSmith, OpenTelemetry (OTLP), or a simple console logger; observers are just `{ name, on(event) }` objects
- **No coupling, no lock-in** — observability attaches to `AgentEvent` emissions from the runtime; remove it and your agent code is unchanged

## Install

```bash
npm install @agentskit/observability
```

## Quick example

```ts
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
```

## Next steps

- Attach the same **observers** to any runtime built with [`@agentskit/runtime`](https://www.npmjs.com/package/@agentskit/runtime) or wire events from [`@agentskit/core`](https://www.npmjs.com/package/@agentskit/core) `AgentEvent` if you use a custom loop
- Use **LangSmith** or **OTLP** exporters for production; keep `consoleLogger` for local dev

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Emits steps for tracing |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `AgentEvent` stream |
| [@agentskit/eval](https://www.npmjs.com/package/@agentskit/eval) | Quality gates alongside traces |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
