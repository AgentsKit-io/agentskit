# @agentskit/mcp

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="../../apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

**Tags:** `agentskit` · `typescript` · `ai-agents`

[![stability](https://img.shields.io/badge/stability-alpha-orange)](../../docs/STABILITY.md)

Expose AgentsKit tools as an [MCP](https://modelcontextprotocol.io) server — use
them from Claude Desktop, Cursor, Windsurf, or any MCP host.


## Verified proof

- Package metadata and tests live under `packages/mcp/`.
- Package guide: https://www.agentskit.io/docs/packages/mcp
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

`stdout` is the MCP JSON-RPC channel; human output goes to `stderr`.

## Programmatic

```ts
import { createAgentsKitMcpServer } from '@agentskit/mcp'
import { fetchUrl } from '@agentskit/tools'

createAgentsKitMcpServer({ tools: [fetchUrl()] }) // stdio by default
```

Pass `transport` to use a custom MCP transport (e.g. in-memory for tests).

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

```ts
import { createAgentTool } from '@agentskit/mcp'
createAgentsKitMcpServer({ tools: [createAgentTool({ id, description, systemPrompt, adapter })] })
```

## Quick start

<!-- readme-example:quickstart -->
```ts
import '@agentskit/mcp'
console.log('@agentskit/mcp loaded')
```

## Maturity and compatibility

- Stability: **alpha** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/mcp`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
