---
---

Internal: add real Node.js fs/network adapters for the RFC-0006 component subsystem (`packages/cli/src/components/node-fs.ts`). Exports `nodeScanFs`, `nodeWriteFs`, `nodeConfigIo`, and `nodeFetch` — the concrete implementations of the injectable interfaces defined in `scan.ts`, `install.ts`, `config.ts`, and `fetch.ts`. Not exported from the package entry yet — no public API change, no release.
