---
name: project_next16-fumadocs16-ts7
description: Next 16 / Fumadocs 16 migration status for this repo's sites, and whether it unblocks TypeScript 7
metadata:
  type: project
---

As of 2026-10-29 all three sites (apps/docs-next, apps/landing, apps/registry) are on
next ^16.4.2, fumadocs-core/ui ^16.17.7 and fumadocs-mdx ^15.4.9 (the major that fumadocs-core 16
requires; fumadocs-mdx majors are not aligned with core). The repo has no eslint-config-next
(lint is `tsc --noEmit`), so there is nothing to align there.

TypeScript 7 (`latest` = 7.0.2 on npm): Next 16.4 declares no `typescript` peer, and fumadocs-mdx
peers do not constrain it, so Next 16 / Fumadocs 16 are NOT blockers for TS 7. The repo is still on
`^6.0.3` everywhere; the TS 7 bump is a separate task (check tsup dts build and tooling first).

**Why:** ticket #1872 asked to record whether Next 16 unblocks TS 7.
**How to apply:** do not re-migrate Next/Fumadocs; open the TS 7 work as its own ticket.
