# @agentskit/mcp

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

**Tags:** `agentskit` · `typescript` · `ai-agents`

[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)

Expose AgentsKit tools as an [MCP](https://modelcontextprotocol.io) server — use
them from Claude Desktop, Cursor, Windsurf, or any MCP host.


## Verified proof

- Package metadata and tests live under `packages/mcp/`.
- Package guide: https://www.agentskit.io/docs/agents/tools/mcp
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/mcp is the bridge from AgentsKit tools and agents into MCP-compatible coding agents.

- **AgentsKit**: expose tools, integrations, and registry agents through a standard MCP server.
- **Registry**: serve ready agents from [registry.agentskit.io](https://registry.agentskit.io) as callable MCP tools.
- **Playbook**: use [playbook.agentskit.io](https://playbook.agentskit.io) for safe tool design, approvals, and agent handoff patterns.
- **AKOS**: run the same model with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/mcp) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

<!-- readme-command:install -->
```bash
npx @agentskit/mcp --tools fetch,search
```

Then point your MCP host at the command. Example (Claude Desktop config):

```json
{
  "mcpServers": {
    "agentskit": { "command": "npx", "args": ["@agentskit/mcp", "--tools", "fetch,search"] }
  }
}
```

## Flags

| Flag | Effect |
|------|--------|
| `--tools <a,b>` | which tools to expose (default `fetch,search`). Available: `fetch`, `search`, `filesystem`, `shell`, `sqlite` |
| `--fs-root <dir>` | enable the filesystem tool, rooted at `<dir>` |
| `--sqlite <file>` | enable the sqlite query tool against `<file>` |
| `--allow-shell` | enable the shell tool (off by default — it runs commands) |
| `--agents <a,b>` | expose bounded, runnable registry agents as MCP tools |
| `--provider <id>` | provider for registry agents (default `openai`) |
| `--model <id>` | explicit provider model; required when no maintained default exists |
| `--max-steps <1-100>` | bound each delegated agent run (default `8`) |
| `--api-key <value>` | provider key; prefer `<PROVIDER>_API_KEY` to avoid process-list exposure |
| `--base-url <url>` | override a compatible provider endpoint |
| `--help` | print help to `stderr` without contaminating the protocol channel |

`stdout` is the MCP JSON-RPC channel; human output goes to `stderr`.

## Programmatic

```ts
import { createAgentsKitMcpServer } from '@agentskit/mcp'
import { fetchUrl } from '@agentskit/tools'

createAgentsKitMcpServer({ tools: [fetchUrl()] }) // stdio by default
```

Pass `transport` to use a custom MCP transport (e.g. in-memory for tests).
Server construction rejects malformed metadata, invalid or duplicate tool names,
and invalid transports with `AK_CONFIG_INVALID`. The published tool list and
top-level definition fields are snapshotted, and observer exceptions or rejected
promises cannot alter protocol behavior. Nested schemas remain trusted tool-owned
configuration.

## Expose whole agents (agents as MCP tools)

Run a registry agent server-side and expose it as a single MCP tool — the host
delegates a specialized job instead of orchestrating primitives:

```bash
npx @agentskit/mcp --agents legal-contract-reviewer,fintech-kyc-screener --provider openai
```

`--provider` covers the first-class adapters (openai, anthropic, gemini, ollama)
plus the OpenAI-compatible set (deepseek, grok, groq, mistral, cohere, together,
fireworks, openrouter, cerebras, kimi, huggingface, qwen, lmstudio, vllm, llamacpp)
and any other OpenAI-compatible provider in the models.dev catalog. Key from
`--api-key` or `<PROVIDER>_API_KEY`; `--model` / `--base-url` optional.

Registry IDs are validated before URL construction. Each remote request is
abortable, defaults to a 10-second timeout, and is capped at 128 KiB. Registry
source is parsed as bounded text and is never executed.

```ts
import { createAgentTool } from '@agentskit/mcp'
createAgentsKitMcpServer({ tools: [createAgentTool({ id, description, systemPrompt, adapter })] })
```

## Quick start

<!-- readme-example:quickstart -->
```ts
import { createAgentsKitMcpServer } from '@agentskit/mcp'
import { createInMemoryTransportPair } from '@agentskit/tools/mcp'

const [, transport] = createInMemoryTransportPair()
const server = createAgentsKitMcpServer({ tools: [], transport })
await server.close()
```

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/mcp`

This package intentionally implements the MCP tools subset over stdio or an
injected transport. HTTP/WebSocket transports, resources, prompts, sampling,
authentication, rate limiting, and persistence are not built in.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
