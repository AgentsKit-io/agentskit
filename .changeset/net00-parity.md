---
"@agentskit/net": minor
---

Expose abortable sleep, injected retry waits, and cooperative deadlines. Invalid default retry delays reject with `AK_NET_INVALID_INPUT`; `withTimeout` requires a positive timeout and reports `AK_NET_TIMEOUT` only after its deadline.
