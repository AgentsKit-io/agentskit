---
"@agentskit/adapters": patch
---

createFallbackAdapter now advances to the next candidate when one surfaces a
leading `error` chunk (e.g. a 404 stale-model or 429 rate-limit that the
provider adapter emits as a chunk instead of throwing), not just on thrown
errors. This makes multi-model fallback chains (e.g. several free models)
actually cascade past rate-limited/unavailable models. Errors that occur after a
candidate has committed a real content chunk still propagate without retrying.
