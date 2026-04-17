# @agentskit/sandbox

Let agents write and run code safely — in isolated cloud VMs, not on your machine.

[![npm version](https://img.shields.io/npm/v/@agentskit/sandbox?color=blue)](https://www.npmjs.com/package/@agentskit/sandbox)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/sandbox)](https://www.npmjs.com/package/@agentskit/sandbox)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/sandbox)](https://bundlephobia.com/package/@agentskit/sandbox)
[![license](https://img.shields.io/npm/l/@agentskit/sandbox)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `sandbox` · `code-execution` · `e2b` · `secure-execution` · `code-interpreter`

## Why sandbox

- **Code generation that actually executes** — agents can write, run, and iterate on code without you worrying about what they'll do to your filesystem or OS
- **E2B cloud VMs out of the box** — each execution runs in an isolated environment with configurable timeouts, no network by default, and a 50MB memory cap
- **Bring your own backend** — the `SandboxBackend` interface is 2 methods; plug in Docker, Firecracker, or any custom isolation layer
- **Works alongside any other tools** — add `sandboxTool` to the same `tools` array as `webSearch` or `filesystem`; no special wiring needed

## Install

```bash
npm install @agentskit/sandbox @e2b/code-interpreter
```

## Quick example

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { sandboxTool } from '@agentskit/sandbox'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  tools: [sandboxTool({ apiKey: process.env.E2B_API_KEY })],
})

const result = await runtime.run('Write and run a Python script that generates a Fibonacci sequence up to 100')
console.log(result.content)
```

## Features

- `sandboxTool({ apiKey })` — drop-in tool for code execution via E2B cloud VMs
- Configurable timeouts and resource limits
- No network by default — agents cannot exfiltrate data
- `SandboxBackend` interface — 2 methods to bring Docker, Firecracker, or any custom backend
- Follows `ToolDefinition` contract — works in `runtime`, `useChat`, or any custom loop

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime({ tools })` |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | `code` tool can delegate to sandbox |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM for codegen tasks |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | Tool contract |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)
