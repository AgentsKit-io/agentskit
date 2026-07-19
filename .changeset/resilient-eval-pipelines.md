---
'@agentskit/eval': minor
---

Harden evaluation, deterministic replay, CI reporting, and optional Braintrust
upload on the beta line.

Agent and assertion failures are isolated per case, malformed responses and
invalid token counts fail clearly, and replay boundaries now snapshot requests,
chunks, dates, cassettes, time-travel forks, and comparison inputs. Cassette,
snapshot, threshold, embedding, concurrency, limit, and index validation rejects
hostile values instead of returning corrupt or non-finite results.

JUnit and GitHub Actions reporters escape hostile content. Braintrust scorer
output is constrained to finite `[0, 1]` values; optional experiment logs are
awaited, flushed before summarize, and SDK failures return bounded non-secret
warnings without discarding local scores.

This is not a stable promotion. `@agentskit/eval` remains beta, and its 90-day
graduation clock begins only after this minor line is published.
