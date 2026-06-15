---
"@agentskit/svelte": minor
---

svelte reaches **beta**: full headless component parity with `@agentskit/react`.

Adds 8 Svelte 5 headless components (`ChatContainer`, `Message`, `InputBar`,
`Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`, `ToolConfirmation`)
alongside the existing `createChatStore`. Each renders `data-ak-*` attributes
only. Build now compiles `.svelte` via `esbuild-svelte` (dual ESM/CJS preserved);
components ship with sibling `.svelte.d.ts` types. Stability tier promoted
alpha → beta.
