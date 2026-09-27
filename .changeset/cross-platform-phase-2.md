---
'@agentskit/cross-platform': minor
'@agentskit/cli': patch
'@agentskit/adapters': patch
'@agentskit/tools': patch
'@agentskit/eval': patch
'@agentskit/sandbox': patch
---

Windows and multi-runtime fixes through `@agentskit/cross-platform`.

- `@agentskit/cross-platform`: add `spawnShell` / `runShell` (platform shell: `sh -c` or `cmd.exe /d /s /c`), `shellCommand`, and `spawnNodeChild` (`child_process.spawn` with `.cmd` shim resolution for Node-stream callers). The `child-process-import` guardrail ignores type-only imports.
- `@agentskit/cli`: config hooks run through the platform shell (`cmd.exe` on Windows instead of a missing `sh`) and a timeout kills the whole tree. MCP servers started with `npx`/`uvx` resolve on Windows and are disposed with a tree kill.
- `@agentskit/adapters`: CLI providers (`claude`, `codex`, `gemini`…) installed as npm `.cmd` shims start on Windows; termination kills the whole tree.
- `@agentskit/tools`: `shell` resolves `.cmd` shims, accepts Windows paths with `\`, kills the tree on timeout, and defaults `env` to `safeEnv()` (system variables only) so executables can start on Windows without leaking secrets.
- `@agentskit/eval`: `reportToCi` works on Windows (no `O_NOFOLLOW`) by writing artifacts atomically, which replaces a planted symlink instead of following it.
- `@agentskit/sandbox`: `nodeSpawner` resolves `.cmd` shims and kills process trees on every OS.
