# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | Yes       |
| < 0.3   | No        |

## Reporting a Vulnerability

Please report security issues through GitHub's private vulnerability
reporting:

→ <https://github.com/AgentsKit-io/agentskit/security/advisories/new>

If that channel is unavailable, email `emersonfbraun@gmail.com` with
`[agentskit-security]` in the subject. Encrypted reports are welcome —
key fingerprint will be published here once generated.

Please include:

- Affected package(s) + version(s)
- Reproduction steps or a minimal proof of concept
- Suspected severity (see SLA below)
- Whether the issue has been disclosed elsewhere

**Please do not file a public issue or PR for security reports.**

## Disclosure SLA

| Severity | First response | Patch target | Public advisory |
|----------|----------------|--------------|-----------------|
| Critical (RCE, sandbox escape, credential exfiltration) | 24 h | 7 days | within 7 days of patch |
| High (SSRF, auth bypass, data exfiltration) | 48 h | 14 days | within 14 days of patch |
| Medium (DoS, info leak, hardening gap) | 5 days | next minor release | with release notes |
| Low (best-practice, defense-in-depth) | best effort | next minor release | with release notes |

The patch target is "design + implement + test + publish to npm". For
ecosystem-wide issues we coordinate with downstream maintainers before
public advisory.

## Scope

Covered by this policy:

- All `@agentskit/*` npm packages published to the npm registry
- The `agentskit` CLI binary
- This repository's GitHub Actions workflows

Out of scope (best-effort only):

- Example apps under `apps/example-*`
- Third-party adapters published outside the `@agentskit` scope
- The docs site (`apps/docs-next`) hosted on Vercel

## Dual-use components

The following packages and modules ship intentionally powerful
primitives. They are designed for sandboxed / supervised use; running
them against untrusted input without the documented hardening is
itself a misconfiguration, not a vulnerability.

- `@agentskit/tools` — `shell`, `filesystem`, `fetchUrl`, `sqliteQueryTool`, `mcp` client
- `@agentskit/sandbox` — code execution backends
- `@agentskit/core/security` — PII vault, injection detector, rate limiter

Each module's README documents the recommended deployment posture
(allowlists, sandbox wrapping, audit sinks). Vulnerability reports
about these modules should describe how the documented guarantees were
broken, not that the underlying capability exists.

## Supply chain

- All third-party GitHub Actions are pinned to commit SHAs.
- `actions/dependency-review-action` runs on every PR; high-severity
  vulnerabilities or copyleft-licensed deps fail the build.
- `pnpm audit --prod --audit-level=high` runs in CI.
- `CodeQL` (security-and-quality query pack) runs on every PR plus a
  weekly schedule.
- SBOMs are generated on release; ask if you need a specific format.

## Coordinated disclosure

We follow standard 90-day coordinated disclosure unless severity or
exposure justifies a shorter window. Reporters are credited in the
advisory unless they request otherwise.
