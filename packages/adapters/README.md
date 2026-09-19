# @agentskit/adapters

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Connect to any LLM provider — and swap between them — without touching your app code.

[![npm version](https://img.shields.io/npm/v/@agentskit/adapters?color=blue)](https://www.npmjs.com/package/@agentskit/adapters)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/adapters)](https://www.npmjs.com/package/@agentskit/adapters)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/adapters?label=bundle)](https://bundlejs.com/?q=@agentskit/adapters)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `openai` · `anthropic` · `claude` · `gemini` · `chatgpt` · `ollama` · `embeddings` · `providers`

## Verified proof

- Package metadata and tests live under `packages/adapters/`.
- Package guide: https://www.agentskit.io/docs/reference/packages/adapters
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/adapters is the provider layer: swap OpenAI, Anthropic, Gemini, Ollama, local models, and embedding providers without rewriting your agent.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/reference/packages/adapters) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why adapters

- **Vendor independence** — switch from OpenAI to Anthropic to a local Ollama model by changing one line; your hooks, runtime, and tools stay untouched
- **25 native adapters in the catalog** — Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, Mistral, Cohere, Together, Groq, Fireworks, OpenRouter, Hugging Face, LM Studio, vLLM, llama.cpp, LangChain, Vercel AI SDK, and additional compatible providers
- **Embedder functions built in** — the same adapter pattern covers text embeddings, so you can reuse provider config for both chat and RAG
- **One-line local AI** — `ollama({ model: 'llama3.1' })` for fully offline agents with no API key required
- **CLI-backed agents** — `@agentskit/adapters/cli` normalizes text, JSON, and ACP-based local LLM CLIs
- **LangChain bridge** — `@agentskit/adapters/langchain-bridge` turns any adapter into a LangChain `BaseChatModel` for `createAgent`

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/adapters
```

The runtime example below also needs `@agentskit/runtime`. The RAG example
also needs `@agentskit/rag`, `@agentskit/memory`, and the optional `vectra`
peer (`npm install @agentskit/rag @agentskit/memory vectra`).

## Quick example

<!-- readme-example:quickstart -->
```ts
import { anthropic } from '@agentskit/adapters'
import { createRuntime } from '@agentskit/runtime'

// Switch provider by swapping one import
const adapter = anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' })
// const adapter = openai({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' })
// const adapter = ollama({ model: 'llama3.1' })

const runtime = createRuntime({ adapter })
const result = await runtime.run('Summarize the latest AI news')
console.log(result.content)
```

## Embeddings (for RAG)

Use the same package for vector embeddings — wire `openaiEmbedder`, `geminiEmbedder`, or `ollamaEmbedder` into [`@agentskit/rag`](https://www.npmjs.com/package/@agentskit/rag):

```ts
import { openaiEmbedder } from '@agentskit/adapters'
import { createRAG } from '@agentskit/rag'
import { fileVectorMemory } from '@agentskit/memory'

const rag = createRAG({
  embed: openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY! }),
  store: fileVectorMemory({ path: './vectors' }),
})
```

## Features

- Providers: Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, Mistral, Cohere, Together, Groq, Fireworks, OpenRouter, Hugging Face, LM Studio, vLLM, llama.cpp, LangChain, LangGraph, Vercel AI SDK, generic `ReadableStream`
- Embedders: `openaiEmbedder`, `geminiEmbedder`, `ollamaEmbedder`, `deepseekEmbedder`, `grokEmbedder`, `kimiEmbedder`, `createOpenAICompatibleEmbedder`
- Fetch-backed adapters run against the shared `Adapter` contract v1 suite (ADR 0001); SDK-backed adapters have provider-specific contract and resilience coverage
- Custom adapter authoring via `createAdapter()`
- Higher-order adapters: `createRouter` (cost/latency/classifier), `createEnsembleAdapter` (fan-out + merge), `createFallbackAdapter` (ordered try-next)

## CLI-backed adapters

The Node-only `@agentskit/adapters/cli` subpath runs an explicitly selected
local LLM executable without a shell:

```ts
import { createCliAdapter, getCliProviderManifest, resolveCliManifest } from '@agentskit/adapters/cli'

const manifest = getCliProviderManifest('codex')
if (!manifest) throw new Error('provider manifest is unavailable')
const adapter = createCliAdapter(resolveCliManifest(manifest, { mode: 'review-safe' }))
```

The generic factories are `createCliAdapter` (`exec-text`),
`createJsonCliAdapter` (`exec-json`), and `createAcpCliAdapter` (ACP v1 over
JSON lines). The built-in manifests cover Codex, Claude Code (text and JSON
output), Grok CLI, and OpenCode. `resolveCliManifest` keeps command, argv, protocol, provider id, and
mode explicit; `diagnoseCliProviderManifest` verifies availability and an
optional version pattern. `review-safe` is the default: no shell, automatic
installation, native login, MCP, plugins, or terminal tools. Use
`trusted-local` explicitly when a developer intentionally wants the CLI's local
authentication and environment. `requiredCapabilities` is checked before
spawning, and `onDiagnostic` receives redacted exit, timeout, abort, and
output-limit data. Structured output fails closed; timeouts, aborts, output
limits, and non-zero exits produce terminal adapter errors. Process termination
is awaited before the adapter finishes, including when input or output fails.
`restricted-environment` is an explicit environment allowlist mode; it is not
an OS, filesystem, process, or network sandbox. Use `@agentskit/sandbox` when a
real isolation boundary is required.

### `exec-text` vs `exec-json`: what each protocol can return

The protocol decides which stream chunks a manifest can produce. Pick the
manifest by what you need back, not by the CLI name:

| Protocol    | Factory                | Chunks emitted                          | Not available                                  |
| ----------- | ---------------------- | --------------------------------------- | ---------------------------------------------- |
| `exec-text` | `createCliAdapter`     | `text` (streamed), `done`               | `structuredOutput`, `reasoning`, `tool_call`, usage |
| `exec-json` | `createJsonCliAdapter` | `text`, `reasoning`, `tool_call`, `usage`, `done` | streaming (one response per process)   |
| `acp`       | `createAcpCliAdapter`  | `text`, `reasoning` (streamed), `done`  | tool calls (rejected), MCP, plugins, terminal  |

`validateCliProviderManifest` rejects a manifest that claims a capability its
protocol cannot deliver, and `requiredCapabilities` fails before spawning for
the same reason. In practice: the `claude-code` and `codex` manifests are
`exec-text` and only ever yield plain text. For tool calls, usage, or
structured output from Claude Code use `claude-code-json` instead.

The same table is enforced at compile time. `CliProviderManifest` is a union
discriminated by `protocol`, `capabilities` is typed as
`CliCapabilitiesFor<protocol>`, and `getCliProviderManifest('claude-code')`
returns `CliProviderManifestFor<'exec-text'>`, so this does not type-check:

```ts
const manifest = getCliProviderManifest('claude-code')!
resolveCliManifest(manifest, { requiredCapabilities: { tools: true } })
//                                                    ^^^^^ not assignable: exec-text has no tools/structuredOutput
```

### Claude Code

Two first-party manifests wrap the `claude` executable:

- `claude-code` — `claude -p`, `exec-text`. Streams the final answer as text.
- `claude-code-json` — `claude -p --output-format json`, `exec-json`. Parses
  the result envelope into `text`, `tool_call`, and `usage` chunks with
  `session_id`, `total_cost_usd`, `duration_ms`, and `num_turns` as metadata.
  `is_error` or a non-`success` subtype fails closed.

```ts
import { createJsonCliAdapter, getCliProviderManifest, resolveCliManifest } from '@agentskit/adapters/cli'

const manifest = getCliProviderManifest('claude-code-json')
if (!manifest) throw new Error('provider manifest is unavailable')
const adapter = createJsonCliAdapter(resolveCliManifest(manifest, { mode: 'trusted-local' }))
```

When the request carries `context.tools`, the tool list and a
`{ text?, toolCalls }` reply contract are appended to Claude Code's system
prompt via `--append-system-prompt`; `claude-code-json` recognizes that object
(fenced or bare) in the `result` string and emits `tool_call` chunks. Plain prose results stay `text`.
`structured_output` from `--json-schema` is honored the same way. Tool
execution itself remains the consumer's responsibility: the adapter never
enables Claude Code's own tools, MCP, or plugins.

### Prompt serialization

`createCliAdapter` and `createJsonCliAdapter` default to writing the raw
`AdapterRequest` as one JSON line on stdin. That is the right contract for a
purpose-built CLI, but agentic CLIs read stdin as a user prompt, and Claude
Code refuses a raw JSON request containing `systemPrompt` as an apparent
prompt-injection attempt. The first-party manifests therefore use two
exported serializers:

- `serializeCliPrompt` (used by `codex`) writes labelled blocks:

  ```text
  [system]
  You are a reviewer.

  [user]
  review this
  ```

- `serializeCliMessages` plus `claudeCodeRequestArgs` (used by `claude-code`
  and `claude-code-json`) writes only the conversation to stdin (a single user
  message is written bare) and passes the system prompt and the tool contract
  through `--append-system-prompt`. Verified live against Claude Code 2.1:
  the same instructions inside the user prompt, even as labelled `[system]`
  blocks, are flagged as an injection attempt, whereas through the system
  flag a request with `context.tools` comes back as a `tool_call` chunk.

A manifest may declare `serializeRequest`, `requestArgs` (extra per-request
argv, appended after `args`), `parseOutput`, and `parse`; `resolveCliManifest`
forwards them to the factory. `buildCliSystemPrompt(request)` returns the
system prompt plus tool contract for other CLIs with a system-prompt flag.

Use `buildArgs(request)` only for CLIs that require the prompt in argv; it is
request-aware and still uses direct, shell-free spawning. Set
`serializeRequest: () => ''` when the provider does not consume stdin. For
JSONL or event-wrapped output, `parseOutput(stdout)` can decode raw stdout
before the normal `parse(value)` callback runs.
For CLIs that write the final response to a file, `outputFile` reads that file
after process completion with the same byte limit and abort handling.

## LangChain bridge: use any adapter as a LangChain chat model

`langchain()` and `langgraph()` expose a LangChain runnable as an
`AdapterFactory`. The `@agentskit/adapters/langchain-bridge` subpath goes the
other way: `adapterToLangChainModel(adapter)` wraps any `AdapterFactory`
(mock, Ollama, a CLI-backed adapter, ...) as a real `BaseChatModel`, so it can
replace `ChatAnthropic`/`ChatOpenAI` in `createAgent`, `AgentNode`, or a plain
chain. It needs `@langchain/core` (optional peer dependency).

```ts
import { createAgent } from 'langchain'
import { tool } from '@langchain/core/tools'
import { mockAdapter } from '@agentskit/adapters'
import { adapterToLangChainModel } from '@agentskit/adapters/langchain-bridge'

const add = tool(async ({ a, b }) => String(a + b), {
  name: 'add',
  description: 'Add two numbers',
  schema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] },
})
const model = adapterToLangChainModel(mockAdapter({ response: [/* ... */] }), { modelName: 'mock' })
const agent = createAgent({ model, tools: [add] })
```

- `bindTools()` forwards LangChain tools (structured tools, OpenAI-format
  definitions, runnable tools) as AgentsKit `ToolDefinition`s on
  `context.tools`; `tool_choice` lands in `context.metadata.toolChoice`.
- System messages become both a `system` message and `context.systemPrompt`;
  AI messages keep `tool_calls`; tool messages keep `tool_call_id`.
- `tool_call` chunks become `AIMessage.tool_calls` (args parsed from JSON),
  `usage` chunks become `usage_metadata`, `reasoning` chunks land in
  `additional_kwargs.reasoning`, `error` chunks throw, and `.stream()` yields
  `AIMessageChunk`s with `tool_call_chunks`.
- Every response is a real `AIMessage`/`AIMessageChunk` instance, so
  `wrapModelCall` middleware and `responseFormat` work together. The default
  `profile` reports `toolCalling` and no native `structuredOutput`, so
  `createAgent` uses its tool strategy, which any tool-calling adapter can
  satisfy. Pass `profile: { structuredOutput: true }` only for adapters that
  honour a provider-side JSON schema.

## Stream guarantees

- A stream terminates exactly once with `done` or `error`; terminal errors carry an `Error` in `metadata.error`.
- Provider streams that close before their native completion marker are treated as truncated, not successful.
- `abort(reason)` propagates to active fetch readers and SDK requests and terminates with the same error semantics.
- Native tool histories preserve call/result correlation. Parallel tool results are encoded in a single provider turn where required.
- Credentials stay in provider headers when the protocol supports them; Gemini API keys are never placed in request URLs.
- `vercelAI` consumes the Vercel AI SDK UI message stream v1 protocol, including its required response header and `[DONE]` marker.

## Higher-order adapters

```ts
import { createRouter, anthropic, openai } from '@agentskit/adapters'

// Auto-pick cheapest capable candidate per request.
const router = createRouter({
  candidates: [
    { id: 'haiku', adapter: anthropic({ model: 'claude-haiku-4-5' }), cost: 0.25 },
    { id: 'sonnet', adapter: anthropic({ model: 'claude-sonnet-4-6' }), cost: 3 },
    { id: 'gpt-mini', adapter: openai({ model: 'gpt-4o-mini' }), cost: 0.15 },
  ],
})
```

See [Adapter router](https://www.agentskit.io/docs/reference/recipes/adapter-router), [Ensemble](https://www.agentskit.io/docs/reference/recipes/adapter-ensemble), and [Fallback chain](https://www.agentskit.io/docs/reference/recipes/fallback-chain).

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `Adapter`, `EmbedFn`, types |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Headless `createRuntime` |
| [@agentskit/rag](https://www.npmjs.com/package/@agentskit/rag) | `createRAG` + embedders |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Vector + chat memory backends |

## Testing Adapters

Three built-in utilities let you test agents without hitting a real LLM.

### `mockAdapter` — deterministic responses

```ts
import { mockAdapter } from '@agentskit/adapters'

const adapter = mockAdapter({
  response: [
    { type: 'text', content: 'Hello!' },
    { type: 'done' },
  ],
})
```

Pass a function to make responses request-aware, or pass an array of arrays to return different chunks on each call (sequenced mode). Use the optional `history` array to capture every request for assertions.

### `recordingAdapter` + `inMemorySink` — capture real calls

```ts
import { recordingAdapter, inMemorySink, anthropic } from '@agentskit/adapters'

const sink = inMemorySink()
const adapter = recordingAdapter(
  anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  sink,
)
// Runs the real LLM and captures every chunk to sink.fixture
```

### `replayAdapter` — replay captured fixtures

```ts
import { replayAdapter } from '@agentskit/adapters'
import fixture from './fixture.json'

const adapter = replayAdapter(fixture) // no network calls
```

Typical workflow: record once in dev → commit JSON fixture → replay in CI.

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
- The implementation is hardened for a future freeze, but promotion still requires the 90-day beta window, two released minor lines, accepted package RFC, and repository evidence required by ADR 0024.
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/adapters`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
