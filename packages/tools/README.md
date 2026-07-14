# @agentskit/tools

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Give your agents real-world capabilities without writing a single integration.

[![npm version](https://img.shields.io/npm/v/@agentskit/tools?color=blue)](https://www.npmjs.com/package/@agentskit/tools)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/tools)](https://www.npmjs.com/package/@agentskit/tools)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/tools?label=bundle)](https://bundlejs.com/?q=@agentskit/tools)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `function-calling` · `tool-use` · `mcp` · `web-search` · `filesystem`

## Verified proof

- Package metadata and tests live under `packages/tools/`.
- Package guide: https://www.agentskit.io/docs/packages/tools
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/tools gives agents useful hands: web fetch, search, filesystem, shell, SQLite, integrations, and MCP-friendly tool definitions.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/tools) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why tools

- **Save days of integration work** — web search, filesystem read/write, shell execution, and directory listing are ready to drop in; no wiring required
- **Safe by default** — filesystem tools are sandboxed to a `basePath`, shell commands require an explicit allowlist, so agents can't escape their boundaries
- **Composable with any runtime** — tools are just objects with a schema; they work with `@agentskit/runtime`, `useChat`, or any custom ReAct loop
- **Extend without friction** — author custom tools with `@agentskit/templates` and register them the same way as built-ins

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/tools
```

## Quick example

<!-- readme-example:quickstart -->
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

### Built-ins (6)

- `webSearch()` — live web search with pluggable providers (Tavily, Brave, SerpAPI, custom).
- `fetchUrl()` — safe HTTP GET with JSON / text handling, size cap, boilerplate stripping.
- `filesystem({ basePath })` — sandboxed read, write, list, delete, stat, exists.
- `shell({ allowed })` — shell execution with command allow-list + timeout.
- `sqliteQueryTool({ path })` — read-only SQL against a local SQLite file. Optional peer dep on `better-sqlite3`. **Note:** never feed unvalidated user prompts straight into the `sql` field — wrap with input filtering or use parameterized helpers if exposing it to untrusted input.
- `slackTool({ webhookUrl })` — post to a Slack Incoming Webhook. For Bearer-token features (search, channel listing), use the `slack()` integration.

### Integrations (20+)

`github`, `linear`, `slack`, `notion`, `discord`, `gmail`,
`googleCalendar`, `stripe`, `postgres`, `s3`, `firecrawl`, `reader`,
`documentParsers` (PDF / DOCX / XLSX), `openaiImages`, `elevenlabs`,
`whisper`, `deepgram`, `maps`, `weather`, `coingecko`, `browserAgent`
(Puppeteer). Each integration exports granular sub-tools (e.g.
`githubCreateIssue`, `stripeCreatePaymentIntent`) alongside the bundled
set.

### Authoring + composition

- `defineZodTool` — Zod-based factory with runtime validation + type inference.
- `composeTool` — chain N tools into one macro tool (each step receives previous output).
- `wrapToolWithSelfDebug` — LLM-corrected retries on schema-mismatch or execution failure.
- `createMandatorySandbox` — policy wrapper: `allow` / `deny` / `requireSandbox` / `validators`.

### MCP bridge

- `createMcpClient` + `toolsFromMcpClient` — consume any MCP server's tools.
- `createMcpServer` — publish AgentsKit tools to any MCP host.
- Stdio + HTTP/SSE + in-memory transports.

All tools honor the `ToolDefinition` contract (ADR 0002) — parallel
tool calling works with any adapter, `@agentskit/runtime`, `useChat`,
or a custom loop.

## Subpaths

| Subpath | Contents |
|---------|----------|
| `@agentskit/tools/mcp` | `createMcpClient`, `createMcpServer`, `toolsFromMcpClient`, stdio + in-memory transports. [MCP bridge recipe](https://www.agentskit.io/docs/recipes/mcp-bridge). |
| `@agentskit/tools/integrations` | `github`, `linear`, `slack`, `notion`, `discord`, `gmail`, `googleCalendar`, `stripe`, `postgres`, `s3`, `firecrawl`, `reader`, `documentParsers`, `openaiImages`, `elevenlabs`, `whisper`, `deepgram`, `maps`, `weather`, `coingecko`, `browserAgent`. [Integrations recipe](https://www.agentskit.io/docs/recipes/integrations) + [More integrations](https://www.agentskit.io/docs/recipes/more-integrations). |

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

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/tools`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
