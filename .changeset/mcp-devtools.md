---
"@agentskit/tools": minor
---

Add `@agentskit/tools/mcp-devtools` — exposes a runtime inspection surface as MCP tools so any MCP-aware client (Claude Code, Cursor, Codex, Aider) can drive a running AgentsKit runtime. Closes #777.

The new subpath ships:

- `RuntimeInspector` — capability surface a runtime adapts to. Every method is optional; only the tools whose inspector method exists get registered. A read-only inspector (just `listSessions` / `inspectSession`) is a valid production-monitoring configuration.
- `devtoolsTools(options)` — returns a `ToolDefinition[]` ready to hand to `createMcpServer` from `@agentskit/tools/mcp`. Eleven tools when fully populated: `devtools_list_sessions`, `inspect_session`, `list_tools`, `list_skills`, `list_memories`, `pause_runtime`, `resume_runtime`, `step_runtime`, `replay_session`, `list_evals`, `run_eval`. Destructive ops (`pause_runtime`, `resume_runtime`) set `requiresConfirmation: true`.

Auth is intentionally **not** a per-tool argument — bloating every tool schema with an `auth` field that the LLM shouldn't see is the wrong place for the gate. Wrap the MCP transport (HTTP bearer header, WebSocket upgrade auth, file-permissions on stdio) before passing it to `createMcpServer`.

Unblocks the Claude Code skill (#775), Cursor / Windsurf rules pack (#776), and the production agent control surface (#784) — they all consume this surface to drive a running runtime. A reference `RuntimeInspector` adapter wrapping `@agentskit/runtime` ships in a follow-up PR alongside the editor integrations.
