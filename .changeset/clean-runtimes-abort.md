---
'@agentskit/core': patch
'@agentskit/runtime': patch
---

Enforce refuse-by-default confirmation for protected tools and add the `run-aborted` observer event. Runtime runs now hydrate memory before execution, retrieve context once per run, abort active adapter streams, reject aborted runs with `AbortError`, skip persistence on failure or abort, and always dispose initialized tools.
