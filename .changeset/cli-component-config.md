---
---

Internal: add the `.agentskit/components.json` builder/reader/writer (`packages/cli/src/components/config.ts`, RFC-0006 D3). `buildConfig(scan)` derives a framework-idiomatic default config (uiBinding, metaFramework, aliases, per-meta server paths, styling, registries, pinned `$schema`); `serialize`/`parse`/`read`/`write`/`resolveConfig` round-trip it with injectable I/O. Fully unit-tested. Not exported from the package entry yet — no public API change, no release.
