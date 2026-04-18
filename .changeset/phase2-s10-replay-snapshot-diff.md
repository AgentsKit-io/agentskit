---
'@agentskit/eval': minor
---

Add deterministic replay, prompt snapshot testing, and prompt diff tools
(Phase 2 sprint S10 — issues #134, #135, #136).

- `@agentskit/eval/replay` — `createRecordingAdapter`, `createReplayAdapter`,
  `saveCassette` / `loadCassette`. Records every `StreamChunk` from any
  `AdapterFactory` into a cassette; replay is bit-for-bit deterministic
  with `strict` / `sequential` / `loose` matching modes.
- `@agentskit/eval/snapshot` — `matchPromptSnapshot` (Jest-style), plus
  `comparePrompt`, `jaccard`, `cosine`, `normalize`. Supports `exact`,
  `normalized`, and `similarity` modes (with optional embed fn).
- `@agentskit/eval/diff` — `promptDiff` (LCS line diff), `formatDiff`,
  and `attributePromptChange` — "git blame for prompts": given old/new
  prompts and outputs, ranks which changed prompt lines likely caused
  the output shift.
