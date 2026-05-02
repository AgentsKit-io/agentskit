---
'@agentskit/angular': patch
'@agentskit/core': patch
'@agentskit/observability': patch
'@agentskit/react-native': patch
'@agentskit/solid': patch
'@agentskit/svelte': patch
'@agentskit/vue': patch
---

chore(audit): Sprint A test gates — UI bindings + core/rag.

Replaces the placeholder `expect(typeof x).toBe('function')` tests with
real integration coverage of every binding's `useChat` / `createChatStore`
/ `AgentskitChat` against a mock adapter. Streams content, exercises
every controller action, asserts reactive state propagates.

Coverage results vs the per-package gates that this PR raises from `0`
(disabled) to `60`:

| Package | Lines % | Threshold |
|---|---|---|
| `@agentskit/angular` | 100% | 60 |
| `@agentskit/react-native` | 100% | 60 |
| `@agentskit/solid` | 100% | 60 |
| `@agentskit/svelte` | 100% | 60 |
| `@agentskit/vue` | 69% | 60 |

`@agentskit/vue` adds `happy-dom` (devDep) so a render test can exercise
`<ChatContainer>`. `@agentskit/react-native` adds `@testing-library/react`,
`react-dom`, and `happy-dom` (all devDeps) so `renderHook` works.

Adds `packages/core/tests/rag.test.ts` covering `createStaticRetriever`
+ `formatRetrievedDocuments` (rag.ts now at 100% lines, was 6.66%).
Core overall lines coverage: 91.97% → 93.31%.

Raises `@agentskit/observability` lines threshold 55 → 60 (current ≈
84%, comfortably above).

No runtime behaviour change.
