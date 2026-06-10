# @agentskit/mcp

Expose AgentsKit tools as an [MCP](https://modelcontextprotocol.io) server — use
them from Claude Desktop, Cursor, Windsurf, or any MCP host.

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
