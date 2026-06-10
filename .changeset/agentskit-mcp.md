---
"@agentskit/mcp": minor
---

New package `@agentskit/mcp` — expose AgentsKit tools as an MCP server over stdio,
so any MCP host (Claude Desktop, Cursor, Windsurf) can call them. `npx @agentskit/mcp
--tools fetch,search`, or `createAgentsKitMcpServer({ tools })` programmatically. A
thin bridge over `@agentskit/tools/mcp` — no new protocol logic.
