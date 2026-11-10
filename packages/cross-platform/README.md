# @agentskit/cross-platform

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

One place for OS and runtime portability in the AgentsKit ecosystem: spawn processes, handle paths, line endings and files the same way on Windows, macOS and Linux, under Node, Bun and Deno.

[![npm version](https://img.shields.io/npm/v/@agentskit/cross-platform?color=blue)](https://www.npmjs.com/package/@agentskit/cross-platform)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/cross-platform)](https://www.npmjs.com/package/@agentskit/cross-platform)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/cross-platform?label=bundle)](https://bundlejs.com/?q=@agentskit/cross-platform)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `agentskit` · `ai-agents` · `cross-platform` · `windows` · `spawn` · `bun` · `deno` · `node`

## Verified proof

- Package metadata, unit tests and the runtime smoke test live under `packages/cross-platform/`.
- CI matrix: Linux, macOS and Windows × Node, Bun and Deno (`.github/workflows/cross-platform.yml`).
- Decision record: [ADR-0036](../../docs/architecture/adrs/0036-cross-platform-package.md).
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

Every AgentsKit repository used to fix the same Windows bugs by hand: `.cmd` shims failing with `ENOENT`, prompts cut at the first newline, `\` vs `/` in paths, CRLF breaking hashes, `EBUSY` on rename, orphaned child processes. `@agentskit/cross-platform` owns those fixes, and the libraries behind them, so the rest of the ecosystem imports one package instead of re-implementing them.

- **AgentsKit**: `@agentskit/cli`, `@agentskit/adapters`, `@agentskit/tools` and `@agentskit/sandbox` spawn through it.
- **Registry**: ready agents and templates at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: production patterns at [playbook.agentskit.io](https://playbook.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/reference/packages/cross-platform) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/cross-platform
```

## Quick example

<!-- readme-example:quickstart -->
```ts
import { runCommand, splitLines, toPosix } from '@agentskit/cross-platform'

// `npx` is `npx.cmd` on Windows: resolved without `shell: true`.
// The multi-line prompt goes through stdin, so cmd.exe cannot truncate it.
const result = await runCommand('npx', ['--yes', 'prettier', '--stdin-filepath', 'notes.md'], {
  input: '# Notes\n\n*  formatted on any OS and any runtime\n',
  timeoutMs: 60_000,
})

console.log(splitLines(result.stdout).length, 'lines')
console.log(toPosix('C:\\repo\\src\\index.ts'))
```

## Features

| Area | API | Replaces |
|---|---|---|
| Processes | `spawnProcess`, `runCommand`, `spawnShell`, `runShell`, `spawnNodeChild`, `killProcessTree`, `findExecutable`, `commandExists`, `safeEnv` | `child_process` + `shell: process.platform === 'win32'`, prompts in argv, `child.kill()` leaving grandchildren, `process.kill(-pid)` |
| Paths | `toPosix`, `relativePosix`, `joinPosix`, `samePath`, `isPathInside`, `fileUrlToPath`, `moduleDir`, `isMainModule` | `replace(/\\/g, '/')` copies, `new URL(import.meta.url).pathname` |
| Text | `normalizeEol`, `splitLines`, `splitFrontmatter`, `hashText` | `split('\n')`, `/^---\n/`, hashes that differ under `core.autocrlf` |
| Filesystem | `removePath`, `renamePath`, `writeFileAtomic`, `createSymlink`, `copyPath`, `setFileMode` | `EBUSY`/`EPERM` retry loops, `EXDEV` temp files, symlink privilege errors |
| Runtime | `getRuntimeInfo`, `isWindows`, `isBun`, `isDeno` | ad-hoc `process.platform` checks |
| Guardrail | `agentskit-cross-platform check` | Windows regressions found only on a Windows laptop |

- **Native adapter per runtime**: `node:child_process` on Node, `Bun.spawn` on Bun, `Deno.Command` on Deno. stdout/stderr are web `ReadableStream`s everywhere.
- **Browser/edge subset**: `@agentskit/cross-platform/pure` (paths, text, runtime detection) has no `node:` imports.
- **Deno permissions**: a missing `--allow-*` flag raises `AK_PLATFORM_PERMISSION_DENIED` naming the flag. It never prompts.
- **Built on**: `cross-spawn` (Windows command resolution and cmd.exe escaping), `tree-kill`, `pathe`, `std-env`, `graceful-fs`, `which`.

## Test helpers

Import `createFetchStub`, `jsonResponse`, and `withTempDir` from
`@agentskit/cross-platform/testing`. The subpath has no test-runner dependency;
`withTempDir` uses this package's OS temp-directory lookup and retrying cleanup.

## Guardrail

```bash
npx agentskit-cross-platform check --init   # record today's findings as a baseline
npx agentskit-cross-platform check          # fail on any new finding
npx agentskit-cross-platform check --update # lower the baseline after a fix
```

The baseline is a ratchet: counts only go down. Allow a justified exception with a `cross-platform-ignore: <reason>` comment on the line or the line above. A `<rule-id>-ignore: <reason>` comment suppresses only that rule.

Repository guardrails can reuse the exported `runCli` with custom `rules` and an optional `filter` to apply the shared scan and baseline logic to a narrower source set.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `AgentsKitError`, the base of `CrossPlatformError` |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | CLI providers (claude, codex) spawned portably |
| [@agentskit/sandbox](https://www.npmjs.com/package/@agentskit/sandbox) | Local process runtimes |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md). Not 1.0.
- **Node.js 20+** (20.19+), **Bun 1.2+**, **Deno 2+**, and **TypeScript** strict mode
- Windows, macOS and Linux
- Published as `@agentskit/cross-platform`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
