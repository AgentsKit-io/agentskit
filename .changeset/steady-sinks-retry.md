---
'@agentskit/observability': minor
---

HTTP batch sinks now use full-jitter exponential backoff and honor valid `Retry-After` seconds and HTTP-date values as a delay floor capped at 30 seconds. The deprecated `computeBackoffMs` compatibility helper remains available through at least 90 days after this release and will not be removed before 0.14.0.
