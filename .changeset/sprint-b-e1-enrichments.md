---
'@agentskit/adapters': patch
'@agentskit/core': patch
---

chore(audit): Sprint B/E-P1 — error message enrichments.

**Embedder HTTP errors now include URL + body context.** The internal
`fetchAvailableModels` helpers in `openai`, `gemini`, `ollama`, and
`openai-compatible` previously threw bare `HTTP ${status}`. They now
include the full URL and the first 200 chars of the response body, so
the rich-error wrap (`buildModelError`) ends up with diagnostic
context instead of just a status code.

**HITL approval errors now carry id + remediation hint.** The
abort, not-found, and timeout throws in `core/src/hitl.ts:await` and
`decide` are now `AgentsKitError` / `ConfigError` instances with
hints that name the next action (open the approval first, extend
`timeoutMs`, etc.). The approval `id` is included in the message so
log grep finds it.

No message-string regressions — all `toThrow(/regex/)` matchers stay
green. Adapters 322/322, core 265/265.
