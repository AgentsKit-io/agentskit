# Conventions — `@agentskit/cross-platform`

The single owner of OS and runtime portability for the AgentsKit ecosystem
(ADR-0036). Other packages and repositories import from here instead of
calling `child_process`, `cross-spawn` or hand-rolling path/EOL fixes.

## Scope

- **Processes** — `spawnProcess` / `runCommand` / `killProcessTree` /
  `findExecutable` / `safeEnv`. One adapter per runtime (`node-adapter`,
  `bun-adapter`, `deno-adapter`); command resolution and cmd.exe escaping are
  shared through cross-spawn's parser (`process/resolve.ts`).
- **Paths / file URLs** — forward-slash helpers over `pathe`; `fileUrlToPath`,
  `moduleDir`, `isMainModule`.
- **Text** — EOL/BOM normalisation, `splitLines`, `splitFrontmatter`, `hashText`.
- **Filesystem** — retrying rm/rename (`graceful-fs`), atomic write,
  symlink with junction/copy fallback, `setFileMode` (no-op on Windows).
- **Guardrail** — `agentskit-cross-platform check` with a ratchet baseline.
- **`/pure`** — browser/edge-safe subset; must never import `node:` modules.

## What does NOT belong here

- Sandboxing or isolation policy → `@agentskit/sandbox`
- Anything browser-only or UI
- Business logic of a caller (CLI provider flags, MCP protocol, etc.)

## Implementation constraints

- Named exports only; typed errors (`CrossPlatformError`, `AK_PLATFORM_*`).
- Reuse libraries first: cross-spawn, tree-kill, pathe, std-env, graceful-fs,
  which. Add a dependency here rather than in a consumer.
- A new rule in `lint/rules.ts` needs a test that flags it and one that does not.
- Deno permission failures map to `AK_PLATFORM_PERMISSION_DENIED`; never call
  `Deno.permissions.request`.
- `spawnProcess` never throws for a failed start; `exited` rejects.

## Testing

- Unit tests (vitest) run on Node. `smoke/smoke.mjs` runs the built package on
  Node, Bun and Deno across Linux, macOS and Windows in CI; run it locally with
  `pnpm --filter @agentskit/cross-platform build && node smoke/smoke.mjs`.
- Configured line coverage threshold: **85**.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| `shell: true` to make `npx` work on Windows | `spawnProcess('npx', args)` |
| Passing a prompt as an argument | `input:` (stdin) |
| `child.kill()` on timeout | `timeoutMs` / `handle.kill()` (whole tree) |
| `new URL(import.meta.url).pathname` | `moduleDir(import.meta.url)` |
| `text.split('\n')` | `splitLines(text)` |
