# @agentskit/sandbox

Secure code execution for [AgentsKit](https://github.com/EmersonBraun/agentskit) agents.

## Install

```bash
npm install @agentskit/sandbox
npm install @e2b/code-interpreter  # for E2B backend
```

## Quick example

```ts
import { createSandbox } from '@agentskit/sandbox'

const sandbox = createSandbox({ apiKey: process.env.E2B_API_KEY })

const result = await sandbox.execute('console.log("hello")', {
  language: 'javascript',
  timeout: 10_000,
})

console.log(result.stdout)   // "hello"
console.log(result.exitCode) // 0

await sandbox.dispose()
```

## As an agent tool

```ts
import { sandboxTool } from '@agentskit/sandbox'
import { createRuntime } from '@agentskit/runtime'

const runtime = createRuntime({
  adapter,
  tools: [sandboxTool({ apiKey: process.env.E2B_API_KEY })],
})
```

## Custom backend

```ts
import type { SandboxBackend } from '@agentskit/sandbox'

const myBackend: SandboxBackend = {
  async execute(code, options) {
    // your execution logic
    return { stdout: '...', stderr: '', exitCode: 0, durationMs: 100 }
  },
  async dispose() { /* cleanup */ },
}

const sandbox = createSandbox({ backend: myBackend })
```

## Security defaults

| Option | Default |
|--------|---------|
| language | `'javascript'` |
| timeout | `30_000` (30s) |
| network | `false` |
| memoryLimit | `'50MB'` |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
