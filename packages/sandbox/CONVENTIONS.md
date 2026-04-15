# Conventions — `@agentskit/sandbox`

Secure code execution for tools that run untrusted code.

## Stability tier: `beta`

E2B backend works. WebContainer fallback is still experimental. The shape of `createSandbox` and the wrapping pattern may evolve.

## Scope

- `createSandbox({ backend })` factory — returns a sandbox instance
- `sandbox.run(code)` — executes code and returns output
- `wrapWithSandbox(tool, sandbox)` — wraps an existing `ToolDefinition` so its `execute` runs in the sandbox

## Security posture

- Default to **denying** network access. Opt in only when the tool explicitly needs it.
- Default to a small filesystem slice (`/tmp` equivalent) — not the host.
- Resource limits (memory, CPU seconds, wall time) enforced at the backend.
- Never expose the host's API keys or env vars to sandboxed code. Pass only what's needed.

## Adding a backend

1. Create `src/backends/<name>.ts`.
2. Implement the internal `SandboxBackend` interface (local to this package).
3. Respect the security defaults above.
4. Provide a `close()` that cleans up resources.
5. Re-export via `src/index.ts`.

## Testing

- Unit test the wrapping and dispatch logic with a mock backend.
- Integration test against a real E2B session in CI (behind an env flag — don't run on every PR).
- Test the denial paths: attempting network when disabled fails cleanly.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Leaking host env vars into the sandbox | Explicit allowlist at sandbox creation |
| Trusting the sandbox for data integrity | The sandbox is for blast-radius, not correctness |
| Long-running sandbox sessions | Enforce wall time; dispose after each run |
| Allowing arbitrary filesystem paths | Pin to a sandboxed dir |

## Review checklist for this package

- [ ] Bundle size under 10KB gzipped
- [ ] Coverage threshold holds (30% lines, growing)
- [ ] Security defaults preserved
- [ ] New backend has a denial-path test
- [ ] `close()` cleans up resources deterministically
