# @agentskit/core

The zero-dependency foundation that every AgentsKit package builds on — 5 KB gzipped, edge-ready, works everywhere JavaScript runs.

[![npm version](https://img.shields.io/npm/v/@agentskit/core?color=blue)](https://www.npmjs.com/package/@agentskit/core)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/core)](https://www.npmjs.com/package/@agentskit/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/core)](https://bundlephobia.com/package/@agentskit/core)
[![license](https://img.shields.io/npm/l/@agentskit/core)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-stable-brightgreen)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `typescript` · `orchestration` · `streaming` · `chat`

## Why core

- **Zero external dependencies** — no npm bloat, no audit surprises; installs in milliseconds and works in Node, Deno, edge runtimes, and the browser
- **Stable contracts that unlock the whole ecosystem** — six ADR-pinned interfaces (`Adapter`, `Tool`, `Skill`, `Memory`, `Retriever`, `Runtime`) make every package interchangeable
- **Chat state machine included** — `createChatController` handles streaming, abort, and message history so you never implement that loop yourself
- **Under 10 KB gzipped, always** — budget enforced in CI; the foundation you can commit to for the long term

## Install

```bash
npm install @agentskit/core
```

## Quick example

```ts
import { createChatController, createInMemoryMemory } from '@agentskit/core'
import { anthropic } from '@agentskit/adapters'

const controller = createChatController({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  memory: createInMemoryMemory(),
})

await controller.send('Hello!')
console.log(controller.getState().messages)
```

## Features

- `createChatController` — streaming-capable chat state machine with abort support
- `createInMemoryMemory` — zero-config in-process memory for prototyping
- TypeScript types for every contract: `ToolDefinition`, `SkillDefinition`, `AgentEvent`, `Adapter`, `Memory`, `Retriever`, `RuntimeResult`
- Event emitter for `AgentEvent` streams — observability hooks attach here
- Dual CJS/ESM output, strict TypeScript, no `any`

## Error handling

AgentsKit ships a **didactic error system** inspired by the Rust compiler. Every error includes a `code`, a `hint` for the fix, and a `docsUrl` — no more vague `"Something went wrong"` messages.

```ts
import {
  AgentsKitError,
  AdapterError,
  ToolError,
  MemoryError,
  ConfigError,
  ErrorCodes,
} from '@agentskit/core'

try {
  await runtime.run(task)
} catch (err) {
  if (err instanceof ToolError) {
    // err.code     → 'AK_TOOL_EXEC_FAILED'
    // err.hint     → actionable suggestion
    // err.docsUrl  → https://agentskit.dev/docs/tools
    console.error(err.toString())
    // error[AK_TOOL_EXEC_FAILED]: ...
    //   --> Hint: ...
    //   --> Docs: https://agentskit.dev/docs/tools
  }
}
```

Available error codes (via `ErrorCodes`):

| Code | Thrown by |
|------|-----------|
| `AK_ADAPTER_MISSING` | adapter not provided to the controller |
| `AK_ADAPTER_STREAM_FAILED` | streaming call to the provider fails |
| `AK_TOOL_NOT_FOUND` | requested tool name is not registered |
| `AK_TOOL_EXEC_FAILED` | `execute()` throws |
| `AK_MEMORY_LOAD_FAILED` | memory.load() fails |
| `AK_MEMORY_SAVE_FAILED` | memory.save() fails |
| `AK_MEMORY_DESERIALIZE_FAILED` | persisted state is corrupt |
| `AK_CONFIG_INVALID` | required config is missing or wrong type |

## Type-safe tools with `defineTool`

`defineTool` infers the TypeScript type of `execute`'s `args` parameter from the JSON Schema — no manual casting.

```ts
import { defineTool } from '@agentskit/core'

const greet = defineTool({
  name: 'greet',
  schema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
  } as const,   // as const is required for inference
  execute(args) {
    // args.name → string  (inferred, not cast)
    return `Hello, ${args.name}!`
  },
})
```

Use `InferSchemaType<typeof schema>` to reference the inferred type elsewhere in your codebase.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM chat + embedding providers |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime` — agents without UI |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) | `useChat`, headless chat components |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Executable tools |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)
