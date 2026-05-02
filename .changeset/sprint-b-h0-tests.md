---
'@agentskit/adapters': patch
'@agentskit/skills': patch
---

chore(audit): Sprint B/H-P0 — adapter + skill behavioural tests.

**`@agentskit/adapters`** — closes the gap for the three adapters that
the parametric `runAdapterContract` harness skips because they wrap
third-party runtimes instead of going through `globalThis.fetch`:

- `tests/langchain.test.ts` — covers `langchain` (stream + streamEvents
  modes, content-shape extraction, tool_call event mapping, error
  propagation, abort no-op) and `langgraph` (delegation in events
  mode).
- `tests/vercel-ai.test.ts` — covers `vercelAI` adapter (body stream
  → text chunks → done, configured headers forwarded, request body
  shape with messages/tools/systemPrompt, default empty capabilities).

Adapter test count 322 → 333.

**`@agentskit/skills`** — adds behavioural assertions for the six
skills with no dedicated test file:

- `tests/extra-skills.test.ts` — covers `codeReviewer`,
  `customerSupport`, `securityAuditor`, `sqlAnalyst`, `sqlGen`,
  `technicalWriter`. Verifies contract (name / description /
  systemPrompt size / tools+delegates arrays / examples) plus
  per-skill behavioural signals (codeReviewer mentions verdict +
  severity tags, sqlGen warns about unsafe concatenation /
  injection, securityAuditor references vulnerability classes,
  etc.).

Skills test count 83 → 126.

No runtime behaviour change.
