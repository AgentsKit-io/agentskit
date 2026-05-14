---
"@agentskit/core": patch
"@agentskit/tools": patch
"@agentskit/sandbox": patch
---

Phase 5 coverage gates (#841):

- `vitest.shared.ts` gains `criticalFiles` opt — a per-file lines%
  override on top of the package-level threshold.
- Apply 90% gate to security-critical surfaces:
  - `@agentskit/tools`: `shell.ts`, `filesystem.ts`, `fetch-url.ts`,
    `sqlite-query.ts`, `mcp/client.ts`, `mcp/transports.ts`
  - `@agentskit/core`: `security/vault.ts`, `security/rate-limit.ts`,
    `security/pii.ts`, `security/injection.ts`
  - `@agentskit/sandbox`: `policy.ts` (`sandbox.ts` held at 80 because
    its dynamic-import branch is integration-only)
- Tests-only: no runtime behaviour change.
