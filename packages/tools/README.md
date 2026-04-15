# @agentskit/tools

![stability: stable](https://img.shields.io/badge/stability-stable-brightgreen)

Give your agents real-world capabilities without writing a single integration.

## Why

- **Save days of integration work** — web search, filesystem read/write, shell execution, and directory listing are ready to drop in; no wiring required
- **Safe by default** — filesystem tools are sandboxed to a `basePath`, shell commands require an explicit allowlist, so agents can't escape their boundaries
- **Composable with any runtime** — tools are just objects with a schema; they work with `@agentskit/runtime`, `useChat`, or any custom ReAct loop

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

## Next steps

- Combine with **skills** from [`@agentskit/skills`](https://www.npmjs.com/package/@agentskit/skills) on `runtime.run({ skill })` for specialized behavior
- Author custom tools with [`@agentskit/templates`](https://www.npmjs.com/package/@agentskit/templates) `createToolTemplate` / `scaffold`

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ToolDefinition` contract |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime({ tools })` |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) | `useChat` + tools in the UI |
| [@agentskit/templates](https://www.npmjs.com/package/@agentskit/templates) | Scaffold new tools |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
