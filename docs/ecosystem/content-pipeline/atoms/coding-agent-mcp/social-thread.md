1/ Connect AgentsKit to your coding agent

Why it exists: Developers should be able to use the same AgentsKit tools and agents inside their existing coding agent without building or maintaining a separate integration for every host.

2/ The path:
1. `codex mcp add agentskit -- npx -y @agentskit/mcp@0.3.7 --tools fetch,search`
2. `claude mcp add --scope project --transport stdio agentskit -- npx -y @agentskit/mcp@0.3.7 --tools fetch,search`
3. `pnpm --filter @agentskit/mcp exec vitest run tests/coding-agent-hosts.test.ts`
4. `pnpm --filter @agentskit/mcp smoke:published`

3/ Claims (generated, not hand-typed):
- 22 packages
- 50 integrations

4/ Next products:
- AgentsKit: Build agents without gluing many libraries together.
- AgentsKit Registry: Copy ready-made agents and own the source.
- AgentsKit Chat: Define one agent experience and deliver it across interfaces.

5/ This thread is a draft atom. Publishing requires explicit human approval.
