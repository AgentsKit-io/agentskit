# Conventions — `@agentskit/sandbox`

Secure code execution for tools that run untrusted code.

## Stability tier: `beta`

E2B backend works with hardened lifecycle/config. Web Worker provides thread + DOM isolation only (not a network/filesystem boundary; **not** WebContainer). Local runtimes (process, seatbelt, bwrap, docker) are beta. The shape of `createSandbox` and the wrapping pattern may still evolve under semver minor until 1.0 — see [RFC 0013](../../rfcs/0013-sandbox-stable.md).

## Scope

- `createSandbox({ backend | apiKey })` factory — returns a sandbox instance
- `sandbox.execute(code, options?)` — executes code and returns `{ stdout, stderr, exitCode, durationMs }`
- `sandboxTool(config?)` — ready-made `code_execution` `ToolDefinition`
- `createMandatorySandbox({ sandbox, policy })` — allow/deny/requireSandbox policy wrapper
- Local runtimes: `noneSandbox`, `processSandbox`, `sandboxExecRuntime`, `bwrapRuntime`, `dockerRuntime`
- Browser: `@agentskit/sandbox/web` → `webWorkerBackend`, `runStreaming`

## Security posture

- Default to **denying** network access (`network: false` → E2B `allowInternetAccess: false`).
- Default to a small blast radius: cloud VM (E2B) or constrained local runtime — not the host process for untrusted code.
- Resource limits: per-execute wall time is enforced; combined stdout+stderr is byte-capped. **`memoryLimit` is a hint for custom backends only** — not applied by E2B or Web Worker.
- Never expose the host's API keys or env vars to sandboxed code. Pass only what's needed.
- `requireSandbox` **delegates args to `sandbox.execute` and does not run the original tool body**.
- Web Worker: thread + DOM isolation only — **not** a multi-tenant security sandbox.

## Adding a backend

1. Implement the package-local `SandboxBackend` interface (`execute` + optional `dispose`).
2. Respect the security defaults above.
3. Provide a `dispose()` that cleans up resources deterministically (including in-flight init).
4. Re-export via `src/index.ts` (or `src/web/index.ts` for browser-only).

## Testing

- Unit test wrapping/dispatch with a mock backend.
- Lifecycle tests: concurrent init, dispose-during-init, double dispose, execute-after-dispose, execute timeout kills/resets VM.
- Denial paths: invalid config, peer missing vs backend failure, docker escape args, seatbelt path scope.
- Integration against a real E2B session in CI stays behind an env flag.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Leaking host env vars into the sandbox | Explicit allowlist at sandbox creation |
| Trusting Web Worker for multi-tenant isolation | Use E2B / container runtimes for real boundaries |
| Promising `memoryLimit` enforcement on E2B | Document as custom-backend hint only |
| Classifying every `@e2b` error as peer missing | Only module-not-found → `AK_SANDBOX_PEER_MISSING` |
| Long-running sandbox sessions | Enforce wall time; dispose after use |
| Allowing arbitrary host filesystem paths | Pin to workspace + explicit extras |

## Review checklist for this package

- [ ] Coverage threshold holds (85% lines package floor)
- [ ] Security defaults preserved (`network: false`)
- [ ] New backend has a denial-path test
- [ ] `dispose()` cleans up resources deterministically (no orphan VMs)
- [ ] Docs claims match actual enforcement
- [ ] No stable/1.0 claim without ADR 0024 gates
