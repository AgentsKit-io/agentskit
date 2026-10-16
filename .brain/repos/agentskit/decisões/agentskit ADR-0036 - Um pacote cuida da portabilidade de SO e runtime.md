---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0036-cross-platform-package.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime

> [!tldr] Em linguagem comum
> Um pacote cuida da portabilidade de sistema operacional e de runtime (`@agentskit/cross-platform`). Ainda proposto. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: proposto (`Proposed` na fonte). **Data**: 2026-09-27.

## Decisão em linguagem comum

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

## Contexto

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

## Consequências

- Supported runtimes: Node ≥ 20.19, Bun ≥ 1.2, Deno ≥ 2.0, each verified by a
  minimum-version row of the CI matrix on Linux and Windows. Bun 1.1 was the
  first target but cannot read pnpm's `node_modules` junctions on Windows.
- Migration is phased: this package and repository wiring first; then the
  AgentsKit packages that spawn processes (`cli`, `adapters`, `tools`,
  `sandbox`, `eval`); then each ecosystem repository after publication.
- The guardrail baseline records today's findings; new code cannot add more.
- `cross-spawn`'s `_parse` is an underscore export. It has been stable since
  cross-spawn 6; the smoke matrix catches a break on upgrade.

## Pacotes afetados

- [[agentskit-adapters]], [[agentskit-sandbox]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0036-cross-platform-package.md:1`
