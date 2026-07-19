---
'@agentskit/integrations': minor
'@agentskit/tools': patch
---

Graduate `@agentskit/integrations` from alpha to beta: canonical descriptor/registry/projection contract, populated 50-service fetch-only catalog, auth/actions/triggers/testing subpath, packed API gates, and explicit execution boundaries (ADR-0026). Additive contract: `HttpToolOptions.signal` / `ProjectionConfig.signal`, origin-confined auth-bound HTTP, derived confirmation for write/external/destructive actions, and `ProjectionConfig.fetchUntrusted` for model-controlled URLs.

**Migration (Whisper):** direct `@agentskit/integrations` consumers must inject an egress-policy `fetchUntrusted` (fail-closed without it). In the deprecated `@agentskit/tools` facade, `fetch` now controls only provider upload; use the new `fetchUntrusted` option for an explicit policy-enforcing audio transport. Otherwise the facade injects `safeFetch` by default.
