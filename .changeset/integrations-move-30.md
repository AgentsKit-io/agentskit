---
'@agentskit/integrations': minor
'@agentskit/tools': minor
---

Move 30 external service integrations from `@agentskit/tools` into the unified `@agentskit/integrations` catalog.

`@agentskit/tools/integrations/*` are now deprecated re-export shims that re-project the catalog descriptors — the public API (`slack`, `github`, `stripe`, … and their `*Config` types) and runtime behavior are unchanged. Stripe webhook verification is additionally exposed as the catalog's first inbound trigger (`stripe.event`). SDK/driver-injected storage (postgres*, s3, cloudflare-r2) and local tools (browser-agent, document-parsers, sqlite) stay in `@agentskit/tools`.
