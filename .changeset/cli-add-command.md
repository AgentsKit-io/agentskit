---
---

Internal: wire `agentskit add <name>` to the RFC-0006 component install flow (`packages/cli/src/commands/add-component.ts` + `add.ts`). The command now auto-detects components (scan → validate → fetch + checksum → transactional install via `addComponent`) and falls back to the agent path otherwise; adds `--registry`. Thin glue over the already-tested core. Not yet usable end-to-end (the `docs-chat` registry artifact + `agentskit init` are still to ship), so no release.
