---
'@agentskit/adapters': minor
---

Use `@agentskit/net` retry and SSE parsing in provider adapters. Existing `fetchWithRetry` settings remain supported, while jitter now uses the shared rounded full-jitter delay; non-finite `maxAttempts` values and values whose floored value is below one now throw `AdapterError` with `AK_CONFIG_INVALID`. Positive fractional attempts normalize down to a whole number, with the final response returned after those attempts exhaust. Exceptions from `onRetry` or custom `sleep` stop retries immediately, and a retryable response body is canceled before `onRetry`. SSE data preserves significant whitespace and joins multiline events according to the SSE format, and NDJSON flushes incomplete UTF-8 with the standard replacement character and accepts a final record without a newline. `fetchWithRetry` and `readSSELines` are deprecated and will not be removed before adapters 0.20.0 or 90 days after this deprecation, whichever is later.
