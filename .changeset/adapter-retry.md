---
'@agentskit/adapters': minor
---

Auto-retry with exponential backoff is now built into every adapter.

By default, every adapter retries the initial request up to **3 attempts** on transient failures with exponential backoff and full jitter:

- HTTP **408** request timeout
- HTTP **429** rate limit
- HTTP **500/502/503/504** server errors
- Network errors (fetch throws — TypeErrors, ECONNRESET, etc.)

Retries respect the `Retry-After` response header when present.

**4xx errors other than 408/429 do not retry** (they're bad requests or auth issues — retrying would just repeat the failure).

Once the response body starts streaming, retries stop — partial output is already on the wire.

Configure per-adapter:

```ts
import { openai } from '@agentskit/adapters'

const adapter = openai({
  apiKey: KEY,
  model: 'gpt-4o',
  retry: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30_000,
    jitter: true,
    onRetry: ({ attempt, delayMs, reason }) =>
      console.log(`retry #${attempt} in ${delayMs}ms — ${reason}`),
  },
})
```

To opt out entirely, pass `retry: { maxAttempts: 1 }`.

The standalone `fetchWithRetry` helper is also exported for use outside adapters:

```ts
import { fetchWithRetry } from '@agentskit/adapters'

const res = await fetchWithRetry(
  signal => fetch('https://api.example.com/resource', { signal }),
  controller.signal,
  { maxAttempts: 4 },
)
```
