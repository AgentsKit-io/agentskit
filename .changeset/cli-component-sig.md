---
---

Internal: add minisign (Ed25519) signature verification (`packages/cli/src/components/sig.ts`, RFC-0006 D9) — implements the `signatureVerifier` seam the fetch client injects. Parses the minisign public-key + signature wire format, supports both legacy `Ed` (raw bytes) and prehashed `ED` (BLAKE2b-512) kinds, checks the key id, and verifies via `node:crypto` (no external binary). `makeSignatureVerifier(publicKey)` builds the `(manifestRaw, signatureRaw) => Promise<boolean>` the fetch client expects. Fully unit-tested with a generated keypair. Not exported from the package entry yet — no public API change, no release.
