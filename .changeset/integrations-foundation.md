---
'@agentskit/integrations': minor
---

New package `@agentskit/integrations` — the foundation for a unified, single-descriptor service-integration catalog (RFC: integrations split/unification).

Ships the contract and registry only; the catalog is populated in later phases.

- **`Integration` descriptor** — one definition per service (`auth`, `actions[]`, `triggers[]`, `capabilities`) that every consumer layer (agent tools, connector senders, inbound triggers, OAuth specs, marketplace listings) projects from, eliminating the per-service duplication that exists today across `@agentskit/tools` and the OS.
- **`defineIntegration` / `defineAction` / `defineTrigger`** authoring helpers; actions use canonical JSON Schema and receive an auth-bound `IntegrationHttp` client so they never touch raw credentials.
- **Registry** — `createRegistry`, plus the default catalog accessors `registerIntegration` / `getIntegration` / `listIntegrations` / `integrationsByCategory`.
- **`@agentskit/integrations/testing`** — pure contract validators (`validateIntegration`, `assertValidIntegration`) to gate every service descriptor in CI.
- **`pnpm gen:integration <name>`** scaffolds a new service from `services/_template`.

Dependency-light (only `@agentskit/core`; `fetch` + `node:crypto` at runtime). No existing package changes — purely additive.
