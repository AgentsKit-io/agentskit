# `@agentskit/cli` — Architecture Plan

Design blueprint for a Claude-Code–grade terminal harness. Goal: ship incrementally without breaking existing users while opening enough surface area for every extensibility axis below.

---

## 1. Guiding Principles

Everything that follows derives from these rules. When in doubt, refer back.

1. **Thin core, fat plugins.** The CLI core knows lifecycle, rendering, and contracts only. All *capabilities* (tools, skills, providers, hooks, slash commands, MCP servers) ship as plugins — built-ins and third-party use the exact same interface.
2. **Every capability is a *record*, not code inside the CLI.** A tool is a `ToolDefinition`. A slash command is a `SlashCommand`. A skill is a `SkillDefinition`. A hook is a `HookHandler`. Third parties just produce these records; the core doesn't care who wrote them.
3. **Registry last-write wins.** Plugins append to registries; later registrations override earlier ones by name. Users override built-ins without forking.
4. **Config is the user's API.** Anything that mutates runtime behavior must have a config knob — CLI flags, JSON config, and slash commands all end up calling the same setters. One source of truth per concern.
5. **Back-compat until deliberately breaking.** Every refactor ships behind the existing surface; renames go through deprecated re-exports. We raise major version to break.
6. **Events, not callbacks.** Lifecycle = named events on a dispatcher. Plugins subscribe; the core never knows the subscriber list at compile time.
7. **No silent failures.** Every error surfaces in the UI, logs, and (if applicable) the model's next turn. A silent chat is a broken chat.
8. **Streaming is the default.** Every long-running operation emits partial state (tokens, tool output, lifecycle events) so the UI stays alive.
9. **Side effects go through gates.** Tools with side effects (shell, fs_write, network) run through a permission policy. `ask | allow | deny` — never raw.
10. **Portable sessions.** A session is a plain file + metadata. Copyable, shareable, diffable, resumable.

---

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ app/          Ink components.  Pure view + input — no business.     │
├─────────────────────────────────────────────────────────────────────┤
│ commands/     CLI subcommands (chat, run, init, doctor, config).    │
│               One file each. Parses flags → delegates to runtime.   │
├─────────────────────────────────────────────────────────────────────┤
│ runtime/      Session runtime: provider/tool/skill/memory resolvers.│
│               Owns the live config atom + controller.               │
├─────────────────────────────────────────────────────────────────────┤
│ extensibility/                                                      │
│   slash/      registry + built-in commands                          │
│   hooks/      lifecycle event dispatcher                            │
│   permissions/ allow/ask/deny policy engine                         │
│   plugins/    plugin loader + normalizer                            │
│   mcp/        MCP client + tool bridge                              │
├─────────────────────────────────────────────────────────────────────┤
│ config/       Schema + loader (global + project + package.json).    │
├─────────────────────────────────────────────────────────────────────┤
│ sessions/     Store (paths, fs I/O) + resolver (--new/--resume).    │
├─────────────────────────────────────────────────────────────────────┤
│ util/         fs, paths, debounce, ANSI helpers.                    │
└─────────────────────────────────────────────────────────────────────┘
```

Each layer depends only on the layers below. `app/` never imports `config/` directly — it gets props from `commands/`, which resolved them via `config/` + `runtime/`.

---

## 3. Core Contracts

These interfaces are the stable public API. Versioned semver-major.

### Plugin

```ts
export interface Plugin {
  name: string
  version?: string

  slashCommands?: SlashCommand[]
  tools?:         ToolDefinition[]
  skills?:        SkillDefinition[]
  providers?:     Record<string, ProviderFactory>
  hooks?:         HookHandler[]
  mcpServers?:    McpServerSpec[]

  // lifecycle
  init?:    (ctx: PluginContext) => void | Promise<void>
  dispose?: () => void | Promise<void>
}
```

Loaded from:
- `config.plugins` (package specifiers or relative paths)
- `~/.agentskit/plugins/*` (auto-discovery)
- direct `render(<ChatApp plugins={[...]} />)` for programmatic use

### SlashCommand

```ts
export interface SlashCommand {
  name: string
  description: string
  usage?: string
  aliases?: string[]
  category?: string          // groups in /help
  complete?: (partial: string, ctx: SlashCommandContext) => string[]
  run: (ctx: SlashCommandContext, argsText: string) => void | Promise<void>
}
```

### HookHandler

```ts
export type HookEvent =
  | 'SessionStart' | 'SessionEnd'
  | 'UserPromptSubmit'
  | 'PreLLM' | 'PostLLM'
  | 'PreToolUse' | 'PostToolUse'
  | 'Stop' | 'Error'

export interface HookHandler {
  event: HookEvent
  matcher?: RegExp | ((payload: HookPayload) => boolean)
  run: (payload: HookPayload) => HookResult | Promise<HookResult>
}

export type HookResult =
  | { decision: 'continue' }
  | { decision: 'block'; reason: string }   // abort the action, surface reason to model
  | { decision: 'modify'; payload: HookPayload }  // mutate the payload in flight
```

### PermissionPolicy

```ts
export interface PermissionPolicy {
  mode: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions'
  rules: Array<{
    tool: string | RegExp
    action: 'allow' | 'ask' | 'deny'
    scope?: 'session' | 'project' | 'global'
  }>
}
```

### ProviderFactory

```ts
export type ProviderFactory = (config: {
  apiKey?: string
  model: string
  baseUrl?: string
  extra?: Record<string, unknown>
}) => AdapterFactory
```

Third parties register: `plugin.providers = { openrouter: (cfg) => openai({ ...cfg, baseUrl }) }`.

### McpServerSpec

```ts
export interface McpServerSpec {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  timeout?: number
}
```

Bridge pulls each server's tools, normalizes to `ToolDefinition[]`, attaches to runtime.

---

## 4. Configuration Schema

Full surface. All optional. Config files merge: `~/.agentskit/config.json` < project `.agentskit.config.{ts,json}` < `package.json#agentskit` < CLI flag < slash command.

```jsonc
{
  "defaults": {
    "provider":    "openai",
    "model":       "openai/gpt-oss-120b:free",
    "baseUrl":     "https://openrouter.ai/api",
    "apiKey":      "…",                  // discouraged; prefer apiKeyEnv
    "apiKeyEnv":   "OPENROUTER_API_KEY",
    "tools":       "web_search,fetch_url",
    "skill":       "researcher",
    "system":      "You are a helpful assistant.",
    "memoryBackend": "file",             // file | sqlite
    "temperature":   0.7,
    "maxTokens":     4096
  },

  "mode": "chat",                        // chat | run | agent

  "limits": {
    "maxToolIterations":   5,            // caps agent loop
    "maxTokensPerSession": 500000,
    "maxCostPerSession":   2.50,         // USD; triggers `LimitReached` event
    "maxRequestsPerMin":   20
  },

  "keys": {
    "openai":     { "env": "OPENAI_API_KEY" },
    "anthropic":  { "env": "ANTHROPIC_API_KEY" },
    "openrouter": { "env": "OPENROUTER_API_KEY" },
    "serper":     { "env": "SERPER_API_KEY" },
    "tavily":     { "env": "TAVILY_API_KEY" }
  },

  "sessions": {
    "dir":           "~/.agentskit/sessions",
    "autoResume":    true,
    "retentionDays": 30
  },

  "memory": {
    "backend": "sqlite",                 // file | sqlite | redis | custom
    "path":    "./.agentskit.db",
    "maxMessages": 1000
  },

  "rag": {
    "enabled":   true,
    "backend":   "lancedb",              // lancedb | memory | custom
    "dir":       "./.agentskit-rag",
    "sources":   ["./docs/**/*.md", "./packages/**/README.md"],
    "embedder":  { "provider": "openai", "model": "text-embedding-3-small" },
    "chunkSize": 1000,
    "topK":      5
  },

  "integrations": {
    "linear":   { "apiKey": "env:LINEAR_API_KEY" },
    "github":   { "token": "env:GITHUB_TOKEN" },
    "posthog":  { "projectId": "env:POSTHOG_PROJECT_ID" }
  },

  "skills": {
    "available": ["researcher", "coder", "planner", "critic", "summarizer"],
    "active":    ["researcher"]
  },

  "permissions": {
    "mode": "default",
    "rules": [
      { "tool": "web_search",  "action": "allow" },
      { "tool": "fetch_url",   "action": "allow" },
      { "tool": "shell",       "action": "ask"   },
      { "tool": "fs_write",    "action": "ask", "scope": "session" },
      { "tool": "fs_delete",   "action": "deny" }
    ]
  },

  "plugins": [
    "@agentskit/plugin-github",
    "./my-org/plugin.ts"
  ],

  "mcp": {
    "servers": {
      "github":     { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },
      "filesystem": { "command": "mcp-fs", "args": ["--root", "./"] }
    }
  },

  "hooks": {
    "SessionStart":    [{ "run": "echo 'Session began' >> ./audit.log" }],
    "UserPromptSubmit":[{ "run": "./inject-context.sh" }],
    "PreToolUse":      [{ "matcher": "shell|fs_write", "run": "./audit-write.sh" }],
    "PostToolUse":     [{ "run": "echo done" }],
    "Stop":            [{ "run": "./on-exit.sh" }]
  },

  "shortcuts": {
    "keybindings": {
      "new-session":  "Ctrl+N",
      "list-sessions":"Ctrl+L",
      "clear":        "Ctrl+K",
      "interrupt":    "Ctrl+C",
      "toggle-tools": "Ctrl+T"
    }
  },

  "slashCommands": {
    // override built-ins or add custom inline (usage rare; prefer plugin)
    "deploy": {
      "description": "Run the deploy script.",
      "shell": "pnpm deploy"
    }
  },

  "links": {
    "renderer": "osc8",                  // osc8 | plain | bracketed
    "openInBrowser": false
  },

  "codePreview": {
    "enabled":    true,
    "theme":      "github-dark",
    "maxLines":   60,
    "copyShortcut": "Ctrl+Y"
  },

  "ui": {
    "theme": {
      "user":      "green",
      "assistant": "cyan",
      "system":    "yellow",
      "tool":      "magenta",
      "accent":    "cyan"
    },
    "showUsage":    true,                // inline per-message token counts
    "showSession":  true,                // session id in header
    "compact":      false,
    "markdown":     true,
    "spinner":      "braille"            // braille | dots | line
  },

  "telemetry": {
    "observability": {
      "posthog":   { "enabled": true, "projectApiKey": "env:POSTHOG_API_KEY" },
      "langsmith": { "enabled": false }
    },
    "analytics": false
  }
}
```

---

## 5. Harness Behavior

Core runtime responsibilities, in order of every turn:

1. **`UserPromptSubmit`** — dispatch hook; any `block` cancels. `modify` mutates the prompt.
2. **Retrieval** — if RAG enabled, retrieve top-K, attach as a system message.
3. **`PreLLM`** — hook.
4. **Adapter stream** — controller streams tokens, tool calls, usage.
5. **`PreToolUse`** per tool call — hook + permission policy. `ask` → confirmation picker. `deny` → feed denial back to model.
6. **Tool executes**.
7. **`PostToolUse`** — hook. Can modify result before feeding to model.
8. **Feed result → adapter** (agent loop). Repeat until model emits final text or `maxToolIterations` hits.
9. **`PostLLM`** — hook.
10. **Persist**: session file, memory backend, RAG vector store if updated.
11. **`Stop`** — on Ctrl+C or `/exit`.

Every step emits an event on the dispatcher. Observers (`posthog:instrument-product-analytics`, langsmith, custom) subscribe once.

---

## 6. Interactivity

UI surface (Ink):

| Element                 | Purpose                                                   |
|-------------------------|-----------------------------------------------------------|
| `StatusHeader`          | provider · model · tools · mode · msgs · session id       |
| `Message` (per role)    | markdown-rendered, inline usage footer, role icons        |
| `ToolCallView`          | status-colored card, spinner, args + result previews      |
| `ToolConfirmation`      | arrow-key picker: allow once / allow session / deny       |
| `ThinkingIndicator`     | braille spinner, agent vs. thinking label                 |
| `ErrorBanner`           | surfaces any `chat.error` in red                          |
| `FeedbackBanner`        | slash-command feedback (info/warn/error/success)          |
| `InputBar`              | blinking cursor, ↑/↓ message history, `/` slash hint      |
| `CodePreview` (future)  | syntax-highlighted block with copy shortcut               |
| `SessionsPicker` (fut.) | interactive `--list-sessions` with resume/delete          |

Keybindings come from `config.shortcuts.keybindings`. Defaults:

- `Ctrl+C` — interrupt / exit
- `Ctrl+L` — list sessions
- `Ctrl+N` — new session
- `Ctrl+K` — clear history
- `Ctrl+T` — toggle tools auto-allow
- `↑` / `↓` — history
- `Enter` — submit
- `/` — slash command prefix (autocomplete on Tab)

---

## 7. Slash Commands (built-ins + extension)

Categories, registered in `slash/builtins/`:

- **runtime**: `/model`, `/provider`, `/base-url`, `/api-key`, `/temperature`, `/max-tokens`
- **tools**: `/tools`, `/tools-allow <name>`, `/tools-deny <name>`, `/mode plan|accept|default|bypass`
- **skills**: `/skill`, `/skills-list`
- **rag**: `/rag on|off`, `/rag-index <glob>`, `/rag-query <text>`
- **memory**: `/clear`, `/memory-export`, `/memory-import <file>`
- **sessions**: `/sessions`, `/new`, `/resume <id>`, `/fork`, `/rename <label>`
- **integrations**: `/link github`, `/link linear` (OAuth or key prompt)
- **plugins**: `/plugins`, `/plugin-reload`
- **meta**: `/help`, `/usage`, `/cost`, `/exit`

Third-party plugins add their own. `slashCommands` in config override built-ins by name.

Autocomplete: on `Tab` after `/`, complete from registry. Command-specific completion via `SlashCommand.complete`.

---

## 8. Future-Proofing Rules

Applied during every refactor + feature add:

1. **Never hard-code provider or tool names in core paths.** Reference via config or registry keys only.
2. **Always wrap new state in `useRuntime()` hook.** The runtime atom is the single source of live state; anything read ad-hoc breaks slash commands and MCP.
3. **Every new side effect gets a `HookEvent` first.** If there's no hook, add one before calling the function.
4. **Every new user-facing knob gets a config key + a slash command + a CLI flag.** All three route to the same setter.
5. **Every package edit updates `ARCHITECTURE.md`.** The doc is the contract.
6. **Tests live in `__tests__/` adjacent to the source; one file per module.** No monolithic integration tests in `tests/` when a unit test suffices.
7. **Keep `@agentskit/core` under 10 KB gzipped.** Every `build` checks this. CLI can grow, core cannot.
8. **No synchronous fs inside render paths.** Writes go through a debounced worker. UI stays 60 fps (within ink's rerender budget).
9. **Deprecation window = 1 minor release.** Old exports stay with a `@deprecated` JSDoc + console warning for one minor, then drop on major.
10. **Schema files drive validation + types.** Prefer JSON Schema / Zod per config key so `agentskit config validate` can report drift.

---

## 9. Phased Migration

Each phase = one PR, independently reviewable, ships non-breaking (old APIs keep working until the deprecation window closes).

### Phase 1 — Restructure (pure moves + splits)

- Move files to the new layout. No behavior changes.
- Split `commands.ts` → `commands/{chat,run,init,doctor,config,dev,tunnel}.ts`.
- Extract from `chat.tsx`: `app/ChatApp.tsx`, `runtime/use-runtime.ts`, `runtime/use-session-meta.ts`, `runtime/use-tool-permissions.ts`.
- Re-exports from the old `commands.ts` / `chat.tsx` paths for one release (deprecated).

### Phase 2 — Plugin Loader

- `plugins/loader.ts` reads `config.plugins`, imports each module, collects `Plugin` records.
- Merge into runtime registries (slash, tools, skills, providers, hooks).
- `--plugin-dir` CLI flag + `~/.agentskit/plugins/` auto-discovery.
- Document `Plugin` contract in `docs/`.

### Phase 3 — Hook Dispatcher

- `hooks/runner.ts` — event bus bound to controller lifecycle events.
- Shell-based hooks (`{ run: "cmd" }`) executed via `execFile` w/ timeout.
- JS-based hooks (`{ handler: (payload) => … }`) from plugins.
- Built-in events wired: SessionStart/End, UserPromptSubmit, PreLLM, PostLLM, PreToolUse, PostToolUse, Stop, Error.
- `HookResult` return values respected (block/modify/continue).

### Phase 4 — Permission Policy

- `permissions/policy.ts` — matches tool calls against rules.
- Mode flags (`default | plan | acceptEdits | bypassPermissions`) gate behavior.
- `ToolConfirmation` integrates "remember for session/project/global" → writes scoped allowlist to config.
- Replaces current ad-hoc `gateTool()` in `resolve.ts`.

### Phase 5 — MCP Bridge

- `mcp/client.ts` spawns MCP servers per `config.mcp.servers`.
- `mcp/bridge-tool.ts` wraps each server's `tools/list` response as `ToolDefinition`.
- Auto-dispose on session end.
- Expose via `/mcp-reload` slash command.

### Phase 6 — RAG integration (optional, driven by demand)

- Expose `@agentskit/rag` behind `config.rag`.
- Indexing command: `agentskit rag index`.
- Auto-retrieve on every `send()` when enabled.

### Phase 7 — Session polish

- `--list-sessions` becomes interactive `SessionsApp`.
- `/fork` slash command branches a session.
- `/rename` labels sessions for readability.
- `session-id` becomes `label-id` in display (id still canonical).

### Phase 8 — Telemetry + cost tracking

- `config.limits.maxCostPerSession` enforced via provider pricing table.
- `/cost` and `/usage` commands.
- Optional PostHog LLM Analytics auto-instrumentation.

---

## 10. Non-Goals (Kept Explicit)

- **Not a chat GUI.** Terminal only. Web UI lives elsewhere (`@agentskit/react`).
- **Not a provider.** We adapt to existing providers — never host our own model.
- **Not a language.** Skills are prompts + tools, not a DSL.
- **Not an IDE.** No LSP, no editor integration. That's a separate package.
- **No telemetry by default.** All observability opt-in via config.
- **No secrets in config files.** Keys flow through env vars; the loader refuses anything that looks like a raw key (sk-…, ghp-…) with a warning.

---

## 11. Versioning

- `0.x` — everything above MAY break. Document every change.
- `1.0` — `Plugin`, `SlashCommand`, `HookHandler`, `ToolDefinition`, `PermissionPolicy` frozen. Changes to these go through RFC.
- Minor bumps: new capabilities, new config keys (always optional).
- Patch: bug fixes, internal refactors.

---

## 12. Review Checklist (for every PR)

- [ ] New capability has a `Plugin` contract mapping.
- [ ] New knob has config key + slash command + CLI flag.
- [ ] New side effect has a hook event.
- [ ] New error path renders in `ErrorBanner` + logs + propagates to model.
- [ ] `@agentskit/core` size-limit still passes.
- [ ] `ARCHITECTURE.md` updated if the layout changed.
- [ ] Deprecated exports have JSDoc `@deprecated` + console warning.
- [ ] Unit tests for the new module.

---

*This is a living document. Keep it honest — if the code diverges, fix one side to match the other before shipping.*
