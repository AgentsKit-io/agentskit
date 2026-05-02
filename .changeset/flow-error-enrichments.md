---
'@agentskit/runtime': patch
'@agentskit/tools': patch
---

chore(audit): E enrichments — flow registry-key listing + http JSON-content-type guard.

- **E/P1 #586** `compileFlow` now lists every registered handler key
  in the error message + hint when a node references a missing one.
  Previously: `"handler 'x' missing for node 'y'"`. Now: that same
  message plus `Available handlers: a, b, c. Add "x" …`. Same change
  applies to the `validateFlow` failure path — bare `Error` →
  `RuntimeError(AK_RUNTIME_INVALID_INPUT)` with the per-issue list
  inline.
- **E/P2 #589** `httpJson` no longer silently coerces non-JSON to
  string when the server advertised `application/json`. If the
  server says JSON but the body fails to parse, raise
  `ToolError(AK_TOOL_EXEC_FAILED)` with the body preview + cause.
  Other content-types fall back to the raw text body (historical
  behaviour preserved).
- Bare-throw gate allowlist: `packages/runtime/src/flow.ts` removed
  (entire file is now typed).
