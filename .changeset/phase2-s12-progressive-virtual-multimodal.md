---
'@agentskit/core': minor
---

Phase 2 sprint S12 — issues #140, #141, #142.

- `createProgressiveArgParser` + `executeToolProgressively`: stream-
  parse a JSON args object and fire tool execution as soon as a
  trigger field arrives — before the model finishes emitting the
  rest of the arguments.
- `createVirtualizedMemory(backing, { maxActive, retriever? })`: wraps
  any `ChatMemory` with a fixed hot window, preserving the full
  history in the backing store. Optional retriever surfaces
  relevant cold messages on each `load()`. `save()` is cold-safe.
- Multi-modal content parts: provider-neutral `ContentPart` union
  (`text` / `image` / `audio` / `video` / `file`) plus `Message.parts`,
  `textPart` / `imagePart` / `audioPart` / `videoPart` / `filePart`
  builders, and `normalizeContent` / `partsToText` / `filterParts`
  helpers. Text-only adapters keep reading `content`; vision-aware
  adapters read `parts`.
