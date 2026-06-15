---
"@agentskit/solid": minor
---

Add full headless component parity with `@agentskit/react`. `@agentskit/solid` now ships eight `data-ak-*` headless components — `ChatContainer`, `Message`, `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`, and `ToolConfirmation` — alongside the existing `useChat` hook, all sharing the same `ChatReturn` contract from `@agentskit/core`. Components are written as Solid `.tsx` (compiled via `esbuild-plugin-solid` for the bundle and `vite-plugin-solid` for tests). Stability promoted alpha → beta.
