---
---

Stabilize two CI flakes blocking unrelated PRs.

`packages/memory/tests/file-vector.test.ts` vectra block — bump per-test timeout to 30 s. Vectra cold-starts the on-disk index on first `store()`; on slow CI runners that alone exceeds the vitest 5 s default.

`packages/ink/tests/ToolConfirmation.test.tsx` — replace the single 20 ms flush with five chained 20 ms waits (~100 ms total). Three tests using the `capturedHandler` closure pattern need React + ink-testing-library multiple commit cycles between key presses.

No production code changes.
