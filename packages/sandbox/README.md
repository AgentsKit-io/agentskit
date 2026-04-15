# @agentskit/sandbox

![stability: beta](https://img.shields.io/badge/stability-beta-yellow)

Let agents write and run code safely — in isolated cloud VMs, not on your machine.

## Why

- **Code generation that actually executes** — agents can write, run, and iterate on code without you worrying about what they'll do to your filesystem or OS
- **E2B cloud VMs out of the box** — each execution runs in an isolated environment with configurable timeouts, no network by default, and a 50MB memory cap
- **Bring your own backend** — the `SandboxBackend` interface is 2 methods; plug in Docker, Firecracker, or any custom isolation layer

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

## Next steps

- Combine **sandbox** with other tools from [`@agentskit/tools`](https://www.npmjs.com/package/@agentskit/tools) on the same `createRuntime` instance
- For browser or React flows, keep the same tool definitions — they follow [`@agentskit/core`](https://www.npmjs.com/package/@agentskit/core) `ToolDefinition`

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime({ tools })` |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | `code` tool can delegate to sandbox |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM for codegen tasks |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | Tool contract |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
