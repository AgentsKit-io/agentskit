# @agentskit/sandbox

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Let agents write and run code safely — in isolated cloud VMs (E2B), constrained local runtimes, or a browser Web Worker.

[![npm version](https://img.shields.io/npm/v/@agentskit/sandbox?color=blue)](https://www.npmjs.com/package/@agentskit/sandbox)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/sandbox)](https://www.npmjs.com/package/@agentskit/sandbox)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/sandbox?label=bundle)](https://bundlejs.com/?q=@agentskit/sandbox)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `sandbox` · `code-execution` · `e2b` · `secure-execution` · `code-interpreter`

## Verified proof

- Package metadata and tests live under `packages/sandbox/`.
- Package guide: https://www.agentskit.io/docs/packages/sandbox
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)
- Graduation track: [RFC 0013](../../rfcs/0013-sandbox-stable.md) (Proposed — not stable)

## How this fits the ecosystem

@agentskit/sandbox gives agents a safer place to execute code and commands instead of trusting arbitrary tool calls in your app process.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/sandbox) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why sandbox

- **Code generation that actually executes** — agents can write, run, and iterate without unrestricted host access
- **E2B cloud VMs** — optional peer `@e2b/code-interpreter`; defaults to no internet (`allowInternetAccess: false`); per-execute timeout; combined stdout/stderr byte cap
- **Bring your own backend** — `SandboxBackend` is two methods; plug in Docker, Firecracker, or any custom isolation layer
- **Policy wrapper** — `createMandatorySandbox` allow/deny/requireSandbox (requireSandbox **routes args to the sandbox tool** and does **not** run the original body)
- **Works alongside any other tools** — add `sandboxTool` to the same `tools` array as `webSearch` or `filesystem`

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/sandbox @e2b/code-interpreter
```

## Quick example

<!-- readme-example:quickstart -->
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

- `sandboxTool({ apiKey })` — drop-in tool for code execution via E2B (optional peer)
- `createSandbox({ backend | apiKey, network?, timeout?, language? })` — facade with security defaults
- **Defaults:** `network: false`, `timeout: 30_000` ms per execute, language `javascript`
- **`memoryLimit`:** accepted for compatibility; **not enforced** by E2B or Web Worker (custom backends may honor it)
- `SandboxBackend` interface — `execute` + optional `dispose`
- Local runtimes: process, macOS seatbelt, Linux bwrap (beta), Docker
- Browser: `@agentskit/sandbox/web` — Web Worker (thread + DOM isolation only; **not** WebContainer)
- Follows `ToolDefinition` contract — works in `runtime`, `useChat`, or any custom loop

## Honest isolation claims

| Backend | What you get | What you do **not** get |
|---|---|---|
| E2B | Remote VM isolation, optional network deny | Per-instance `memoryLimit` via AgentsKit |
| Web Worker | Off-main-thread + no DOM | Network/FS security boundary; WebContainer |
| `processSandbox` | Child process + env allowlist | OS-level fs/net isolation |
| seatbelt / bwrap / docker | Platform jails (beta) | A stable multi-tenant guarantee yet |

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime({ tools })` |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | tools that pair with mandatory sandbox policy |
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

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md). Not 1.0.
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/sandbox`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
