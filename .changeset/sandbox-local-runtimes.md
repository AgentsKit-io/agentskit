---
'@agentskit/sandbox': minor
---

Add local-process sandbox runtimes complementing the cloud E2B backend:
`noneSandbox`, `processSandbox`, `sandboxExecRuntime` (macOS seatbelt),
`bwrapRuntime` (Linux bubblewrap), `dockerRuntime`, plus `nodeSpawner`,
`SandboxRegistry`, isolation-strictness helpers (`assertStrongIsolation`,
`weakSandboxBanner`, `isStrongIsolation`/`isWeakIsolation`, `WeakSandboxError`),
and the `SandboxRuntime` / `SandboxLevel` / `SandboxExecOptions` contract. Each
runtime shells out to a host binary via the injected `Spawner` (no native deps).
All additive; the E2B `Sandbox` surface is unchanged.
