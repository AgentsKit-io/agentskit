# ADR 0036 — One package owns OS and runtime portability

- **Status**: Proposed
- **Date**: 2026-09-27
- **Related ADRs**: ADR 0031

## Context

Contributors on Windows kept opening pull requests for the same classes of
bug across the ecosystem (agentskit-os, harness, code-review, doc-bridge):

| Class | Symptom | Hand-rolled fixes found |
| --- | --- | --- |
| `.cmd` shims (`npx`, `pnpm`, `claude`, `codex`) | `ENOENT`/`EINVAL` without a shell (CVE-2024-27980) | four variants of `shell: process.platform === 'win32'`, two adoptions of `cross-spawn` |
| Separators | `\` vs `/` in comparisons, baselines and indexes | 60+ inline `replace(/\\/g, '/')` copies, three `normalizeFakePath` |
| Line endings | CRLF breaks hashes, frontmatter, generated-file checks | per-file `.gitattributes` rules and inline `\r\n` replaces |
| File locks | `EBUSY`/`EPERM` on rm/rename | custom retry loops |
| cmd.exe argv | prompts cut at the first newline or 32K | two separate "prompt over stdin" implementations |
| Process trees | `child.kill()` leaves the real process running | two near-identical tree-kill helpers |
| File URLs | `new URL(import.meta.url).pathname` → `/C:/…` | 13 scripts fixed one by one |

Main CI runs only on Linux, so each regression was found on a contributor's
Windows machine. Bun and Deno users hit the same problems plus runtime API
differences.

## Decision

Add `@agentskit/cross-platform` (beta) as the single owner of portability:

1. **Processes** — one native adapter per runtime (`node:child_process`,
   `Bun.spawn`, `Deno.Command`) behind `spawnProcess` / `runCommand`, with
   web `ReadableStream` stdout/stderr. Command resolution and cmd.exe escaping
   are shared through `cross-spawn`'s parser; tree kill uses `tree-kill`.
   Input goes through stdin. Timeout and abort kill the whole tree.
2. **Paths, text, filesystem** — thin wrappers over `pathe`, `graceful-fs`,
   `which` and Node built-ins that Bun and Deno implement.
3. **`/pure` subpath** — paths, text and runtime detection (`std-env`) with no
   `node:` imports, for browsers and edge workers. `@agentskit/core` stays
   zero-dependency.
4. **Deno permissions** — failures raise `AK_PLATFORM_PERMISSION_DENIED` with
   the missing `--allow-*` flag; the package never prompts.
5. **Guardrail** — `agentskit-cross-platform check` flags the patterns above
   against a ratchet baseline (counts only go down), run in each repository's
   quality gates on Linux.
6. **CI** — a Linux/macOS/Windows × Node/Bun/Deno matrix runs only when the
   package changes. `.gitattributes` enforces LF in the repository.

Portability dependencies (`cross-spawn`, `tree-kill`, `pathe`, `std-env`,
`graceful-fs`, `which`) live only in this package. Consumers remove their
direct copies and hand-rolled helpers as they migrate.

## Consequences

- Supported runtimes: Node ≥ 20.19, Bun ≥ 1.1, Deno ≥ 2.0.
- Migration is phased: this package and repository wiring first; then the
  AgentsKit packages that spawn processes (`cli`, `adapters`, `tools`,
  `sandbox`, `eval`); then each ecosystem repository after publication.
- The guardrail baseline records today's findings; new code cannot add more.
- `cross-spawn`'s `_parse` is an underscore export. It has been stable since
  cross-spawn 6; the smoke matrix catches a break on upgrade.
