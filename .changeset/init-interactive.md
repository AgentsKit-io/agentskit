---
'@agentskit/cli': minor
---

`agentskit init` is now interactive by default.

Run with no flags and you get five questions: directory, template, provider, tools, memory, package manager. Pass any flag (or `--yes`) to skip the prompts and use defaults — friendly to CI and scripts.

Templates expanded from two (`react`, `ink`) to four:

- `react` — Vite + React chat UI
- `ink` — terminal chat
- `runtime` — headless agent (no UI)
- `multi-agent` — supervisor pattern with planner + delegates

Each template renders adapter / tools / memory wiring based on your answers. Demo provider produces a deterministic stub so the starter runs without an API key.

```bash
npx agentskit init                                    # interactive
npx agentskit init --template runtime --provider demo --yes   # non-interactive
```
