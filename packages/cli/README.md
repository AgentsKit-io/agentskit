# @agentskit/cli

Chat with any LLM, scaffold projects, and run agents — all from your terminal.

## Why

- **Zero setup for prototyping** — go from idea to running conversation in under a minute; no boilerplate, no config files to write
- **Scaffold production-ready projects** — generate a React chat app or terminal agent with the right structure so you skip the boring setup
- **Script and automate** — pipe inputs, use env vars for keys, and compose with other Unix tools for lightweight agent scripting

## Install

```bash
npm install -g @agentskit/cli
```

## Quick example

```bash
# Chat with Claude instantly
ANTHROPIC_API_KEY=... agentskit chat --provider anthropic --model claude-sonnet-4-6

# Chat with a local model (no API key needed)
agentskit chat --provider ollama --model llama3.1

# Scaffold a new React chat app
agentskit init --template react --dir my-app

# Scaffold a terminal agent
agentskit init --template ink --dir my-cli

# Run a headless agent (same building blocks as the CLI)
agentskit run --help
```

## Next steps

- Generated apps use [`@agentskit/react`](https://www.npmjs.com/package/@agentskit/react) or [`@agentskit/ink`](https://www.npmjs.com/package/@agentskit/ink) — extend with [`@agentskit/tools`](https://www.npmjs.com/package/@agentskit/tools), [`@agentskit/skills`](https://www.npmjs.com/package/@agentskit/skills), and [`@agentskit/runtime`](https://www.npmjs.com/package/@agentskit/runtime) for programmatic agents

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime` — agents outside the CLI |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | All `chat` / `run` providers |
| [@agentskit/ink](https://www.npmjs.com/package/@agentskit/ink) | Ink UI used by interactive `chat` |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | Shared types and contracts |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
