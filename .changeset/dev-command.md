---
'@agentskit/cli': minor
---

New `agentskit dev` command — run an entry file with hot-reload on file changes.

```bash
npx agentskit dev                        # runs ./src/index.ts
npx agentskit dev src/agent.ts           # custom entry
npx agentskit dev --watch "**/*.ts,**/*.json" --ignore "tests/**"
npx agentskit dev --debounce 500
```

Watches your project files (`.ts`, `.tsx`, `.mjs`, `.json`, `.agentskit.config.*` by default), debounces rapid edits, kills and respawns the entry process via `tsx` (or `node` for `.js`).

Keyboard shortcuts:
- `r` — restart manually
- `q` / `Ctrl+C` — stop

Built on `chokidar`. Same flags pass through to your entry as command-line arguments.
