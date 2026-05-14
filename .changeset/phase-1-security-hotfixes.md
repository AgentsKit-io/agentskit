---
"@agentskit/tools": minor
"@agentskit/sandbox": patch
"@agentskit/cli": patch
---

Phase 1 security hot-fixes (tracks issue #841):

- **`fetchUrl`**: blocks SSRF to private/loopback/link-local addresses
  by default (127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, fc00::/7,
  fe80::/10) plus DNS lookups for hostnames; redirects are now followed
  manually so every hop is re-gated. New options: `allowPrivateHosts`,
  `allowedHosts`, `maxRedirects`.
- **`shell`**: default-deny when no allowlist is provided (opt-out via
  `allowAny: true`); switched from `execSync` to `execFile` so the shell
  is never invoked; rejects shell metacharacters (`; & | $ ` < > ( ) ! * ?`)
  to close allowlist-bypass paths like `ls; rm -rf ~`.
- **`filesystem`**: replaced `startsWith` jail with `path.relative` + `..`
  rejection (Windows-safe), and resolves symlinks via `fs.realpath` to
  block symlinked escapes; new `denySymlinks` (default `true`) refuses
  symlinks outright.
- **`@agentskit/tools/mcp` client**: per-request `requestTimeoutMs`
  (default 30s) and `maxPending` bound (default 256) so a silent server
  cannot leak pending entries; `close()` rejects in-flight calls.
- **`@agentskit/tools/mcp` stdio transport**: `maxFrameBytes` cap
  (default 1 MB) — oversized frames kill the child and fire `onClose`.
- **`@agentskit/sandbox` E2B backend**: `clearTimeout` in `finally`
  (no more timer leak per call); documented shared-instance concurrency
  semantics.
- **`@agentskit/cli`**: `shell` tool now passes `allowAny: true`
  explicitly — CLI's `requiresConfirmation` gate covers the dual-use
  surface.
