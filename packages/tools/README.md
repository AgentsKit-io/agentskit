# @agentskit/tools

Give your agents real-world capabilities without writing a single integration.

[![npm version](https://img.shields.io/npm/v/@agentskit/tools?color=blue)](https://www.npmjs.com/package/@agentskit/tools)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/tools)](https://www.npmjs.com/package/@agentskit/tools)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/tools)](https://bundlephobia.com/package/@agentskit/tools)
[![license](https://img.shields.io/npm/l/@agentskit/tools)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-stable-brightgreen)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `function-calling` · `tool-use` · `mcp` · `web-search` · `filesystem`

## Why tools

- **Save days of integration work** — web search, filesystem read/write, shell execution, and directory listing are ready to drop in; no wiring required
- **Safe by default** — filesystem tools are sandboxed to a `basePath`, shell commands require an explicit allowlist, so agents can't escape their boundaries
- **Composable with any runtime** — tools are just objects with a schema; they work with `@agentskit/runtime`, `useChat`, or any custom ReAct loop
- **Extend without friction** — author custom tools with `@agentskit/templates` and register them the same way as built-ins

## Install

```bash
npm install @agentskit/tools
```

## Quick example

```ts
import { createRuntime } from '@agentskit/runtime'
import { openai } from '@agentskit/adapters'
import { webSearch, filesystem, shell } from '@agentskit/tools'

const runtime = createRuntime({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }),
  tools: [
    webSearch(),
    ...filesystem({ basePath: './workspace' }),
    shell({ timeout: 10_000, allowed: ['ls', 'cat', 'grep'] }),
  ],
})

const result = await runtime.run('Find the README and summarize it')
console.log(result.content)
```

## With `useChat` (browser)

Tools are plain `ToolDefinition` values — register them in [`useChat`](https://www.npmjs.com/package/@agentskit/react) the same way as in `createRuntime`.

## Authoring tools with `defineZodTool`

If you use [Zod](https://zod.dev), `@agentskit/tools` ships `defineZodTool` — a factory that:

- Types `execute` args from a Zod schema (full TypeScript inference)
- Validates args at runtime via `schema.parse` before calling your function
- Converts the Zod schema to JSON Schema for the adapter via a user-supplied `toJsonSchema` callback

Zod and `zod-to-json-schema` are **not bundled** — install them as peer dependencies.

```bash
npm install zod zod-to-json-schema
```

```ts
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { defineZodTool } from '@agentskit/tools'
import type { JSONSchema7 } from 'json-schema'

const lookupUser = defineZodTool({
  name: 'lookup_user',
  description: 'Look up a user by ID.',
  schema: z.object({
    userId: z.string().uuid(),
    includeProfile: z.boolean().optional(),
  }),
  toJsonSchema: (s) => zodToJsonSchema(s) as JSONSchema7,
  async execute(args) {
    // args.userId         → string  (UUID-validated by Zod at runtime)
    // args.includeProfile → boolean | undefined
    return await db.users.findById(args.userId, { profile: args.includeProfile })
  },
})
```

For tools without Zod, use `defineTool` from `@agentskit/core` with a JSON Schema `as const`.

## Features

- `webSearch()` — live web search for agents
- `filesystem({ basePath })` — sandboxed read, write, list, delete
- `shell({ allowed })` — shell execution with command allowlist
- `defineZodTool` — Zod-based tool factory with runtime validation and type inference
- All tools follow `ToolDefinition` contract (ADR 0002) — parallel tool calling supported
- Works in `@agentskit/runtime`, `useChat`, or any custom loop

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ToolDefinition` contract |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime({ tools })` |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) | `useChat` + tools in the UI |
| [@agentskit/templates](https://www.npmjs.com/package/@agentskit/templates) | Scaffold new tools |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)
