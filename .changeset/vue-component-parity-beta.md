---
"@agentskit/vue": minor
---

vue reaches **beta**: full headless component parity with `@agentskit/react`.

Adds 7 headless primitives (`Message`, `InputBar`, `Markdown`, `CodeBlock`,
`ToolCallView`, `ThinkingIndicator`, `ToolConfirmation`) alongside the existing
`useChat` composable and batteries-included `ChatContainer`. Each renders
`data-ak-*` attributes only. 100% component coverage; stability tier promoted
alpha → beta. The other framework bindings (svelte/solid/angular/react-native)
remain alpha and follow this as the reference implementation.
