---
---

Internal: add the registry fetch client with per-file integrity (`packages/cli/src/components/fetch.ts`, RFC-0006 D9/D14). Resolves `name`/`@org/name`/URL identifiers to a registry base + item, authenticates private registries via `registryAuth` (env-var bearer, never argv), fetches the manifest (kind + schemaVersion gated) and each port file (inline or per-path), and verifies a SHA-256 over every file — aborting the whole install on any mismatch. The signed-manifest check is an injected `signatureVerifier` seam (minisign/Ed25519 primitive lands separately). Network is injectable; fully unit-tested. Not exported from the package entry yet — no public API change, no release.
