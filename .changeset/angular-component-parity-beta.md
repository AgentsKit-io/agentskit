---
"@agentskit/angular": minor
---

angular reaches **beta**: full headless component parity with `@agentskit/react`.

Adds 8 standalone Angular components (`ChatContainerComponent`, `MessageComponent`,
`InputBarComponent`, `MarkdownComponent`, `CodeBlockComponent`, `ToolCallViewComponent`,
`ThinkingIndicatorComponent`, `ToolConfirmationComponent`) alongside the existing
`AgentskitChat` service. Each renders `data-ak-*` attributes only. Components use
inline templates (JIT); an AOT/`ng-packagr` build is tracked for a future release.
Tested via TestBed. Stability tier promoted alpha → beta.
