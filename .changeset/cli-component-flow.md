---
---

Internal: add the `agentskit add <component>` orchestrator (`packages/cli/src/components/flow.ts`, RFC-0006 install flow). `addComponent(options, deps)` wires the whole subsystem into one transactional install — scan → resolve config → fetch+verify manifest → validate → fetch+checksum files → path-guarded commit (rollback on failure) → write marker → append the tamper-evident audit chain. Pure orchestration over injected fs/network/clock adapters; the CLI command layer supplies real I/O + prompts. Fully unit-tested end-to-end. Not exported from the package entry yet — no public API change, no release.
