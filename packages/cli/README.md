# @agentskit/cli

<p align="center"><img src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" alt="AgentsKit" width="180" /></p>

Chat with any LLM, scaffold projects, and run agents — all from your terminal.

[![npm version](https://img.shields.io/npm/v/@agentskit/cli?color=blue)](https://www.npmjs.com/package/@agentskit/cli)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/cli)](https://www.npmjs.com/package/@agentskit/cli)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/cli?label=bundle)](https://bundlejs.com/?q=@agentskit/cli)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `openai` · `anthropic` · `claude` · `gemini` · `chatgpt` · `cli` · `command-line` · `scaffolding` · `ai-agents` · `autonomous-agents`

## Why cli

- **Zero setup for prototyping** — go from idea to running conversation in under a minute; no boilerplate, no config files to write
- **Scaffold production-ready projects** — generate a React chat app or terminal agent with the right structure so you skip the boring setup
- **Script and automate** — pipe inputs, use env vars for keys, and compose with other Unix tools for lightweight agent scripting
- **Every provider, one command** — switch between OpenAI, Anthropic, Ollama (local), and more with a single flag

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

### agentskit init

![agentskit init](https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/demos/init.gif)

## Features

- `agentskit chat` — interactive streaming chat in the terminal powered by `@agentskit/ink`
- `agentskit init` — interactive project generator (React or Ink templates, production-ready structure)
- `agentskit run` — execute headless runtime agents from the terminal
- `agentskit doctor` — diagnose your environment, packages, and provider config
- `agentskit dev` — hot-reload agent development
- `agentskit tunnel` — expose local agent via public URL
- `agentskit rag index` — chunk + embed files into a file-backed vector store
- `agentskit config` — print merged config or scaffold a template
- **Extensibility** — plugins (slash commands, tools, skills, providers, hooks, MCP servers), permission policy with modes, lifecycle hooks (shell or JS), MCP stdio bridge, session rename + fork, `/usage` + `/cost`
- Provider flags: `--provider`, `--model`, `--system`, `--skill`, `--memory`, `--mode`, `--plugin-dir`
- Env-var based key injection — works seamlessly in CI and scripts

Full reference: [docs/infrastructure/cli](https://www.agentskit.io/docs/infrastructure/cli) · [ARCHITECTURE.md](./ARCHITECTURE.md)

### agentskit doctor

![agentskit doctor](https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/demos/doctor.gif)

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime` — agents outside the CLI |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | All `chat` / `run` providers |
| [@agentskit/ink](https://www.npmjs.com/package/@agentskit/ink) | Ink UI used by interactive `chat` |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | Shared types and contracts |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)
