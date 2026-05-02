# @agentskit/example-embedded

Same agent runs from anywhere. Three host integrations of the
*identical* runtime:

| Host | Wrapper | Try it |
|---|---|---|
| Node CLI | `src/index.ts` | `pnpm --filter @agentskit/example-embedded dev "Why is the sky blue?"` |
| Raycast Script Command | `raycast/agentskit-ask.ts` | Copy into `~/.config/raycast/scripts/agentskit/`, install, type "Ask AgentsKit" in Raycast. |
| VS Code Task | `vscode/tasks.json` | Copy into `.vscode/tasks.json` (or merge), then `Cmd+Shift+P → Tasks: Run Task → AgentsKit · Ask`. |

All three wrap the same `createRuntime({ adapter: openai({...}) })`
shape — the difference is just how the host invokes it.

## Run from Node

```bash
# Demo fallback (no key required):
pnpm --filter @agentskit/example-embedded dev "Hello"

# Real provider:
OPENAI_API_KEY=sk-... pnpm --filter @agentskit/example-embedded dev "Explain JIT compilation in 50 words."

# From stdin:
echo "Summarise this commit message" | pnpm --filter @agentskit/example-embedded dev
```

## Install as a Raycast Script Command

```bash
mkdir -p ~/.config/raycast/scripts/agentskit
cp raycast/agentskit-ask.ts ~/.config/raycast/scripts/agentskit/
cp package.json ~/.config/raycast/scripts/agentskit/
cd ~/.config/raycast/scripts/agentskit
pnpm install
```

Open Raycast preferences → Extensions → Script Commands → Add the
folder. Set `OPENAI_API_KEY` in the script's environment variables
panel. Trigger from Raycast with the prompt argument.

## Wire as a VS Code Task

Copy `vscode/tasks.json` into your project's `.vscode/tasks.json`
(or merge the `tasks` array). The default keybinding for "Run Task"
is `Ctrl+Shift+P → Tasks: Run Task` — bind your favourite shortcut
to it via `keybindings.json`:

```json
{
  "key": "cmd+k cmd+a",
  "command": "workbench.action.tasks.runTask",
  "args": "AgentsKit · Ask"
}
```

Two tasks ship in this template:

- **AgentsKit · Ask** — VS Code prompts for input, the agent
  answers in a dedicated panel.
- **AgentsKit · Ask about selection** — pipes the current editor
  selection to the agent (great for "explain this snippet").

## What's not in scope

- A full VS Code extension. Possible (open a `WebviewPanel`, render
  the React chat from `@agentskit/react`); see
  [`/docs/production/embedded`](https://www.agentskit.io/docs/production/embedded)
  for the pattern.
- LSP server. Same — pattern is documented; building one is a
  weekend project per LSP feature.

## See also

- [`/docs/production/embedded`](https://www.agentskit.io/docs/production/embedded) — full pattern guide.
- [`apps/example-edge`](../example-edge) — same runtime in the opposite
  direction (server-side, no host integration).
- [`apps/example-runtime`](../example-runtime) — speculate / durable /
  topology demos using the same `createRuntime` factory.
