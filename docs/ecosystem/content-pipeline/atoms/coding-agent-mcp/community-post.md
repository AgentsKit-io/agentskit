## Connect AgentsKit to your coding agent

Developers should be able to use the same AgentsKit tools and agents inside their existing coding agent without building or maintaining a separate integration for every host.

### Try it

```bash
codex mcp add agentskit -- npx -y @agentskit/mcp@0.3.6 --tools fetch,search
claude mcp add --scope project --transport stdio agentskit -- npx -y @agentskit/mcp@0.3.6 --tools fetch,search
pnpm --filter @agentskit/mcp exec vitest run tests/coding-agent-hosts.test.ts
pnpm --filter @agentskit/mcp smoke:published
```

### Claims
22 packages, 50 integrations

Source fixture: `packages/mcp/fixtures/run-coding-agent-hosts.mjs`

Status: draft — awaiting human approval before community publish.
