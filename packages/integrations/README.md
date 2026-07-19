# @agentskit/integrations

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

**Tags:** `agentskit` · `typescript` · `ai-agents`

[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)

Unified, plug-and-play service integrations for AgentsKit agents — one descriptor
per service, projected into tools, connectors, triggers, and auth. Every
integration is HTTP/`fetch`-only: no vendor SDKs are bundled or required
(see [ADR-0012](../../docs/architecture/adrs/0012-vendor-adapter-scope.md)).


## Verified proof

- Package metadata and tests live under `packages/integrations/`.
- Package guide: https://www.agentskit.io/docs/packages/integrations
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/integrations turns SaaS APIs into agent-ready tools, connectors, triggers, and auth from one service descriptor.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/integrations) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/integrations
```

## Quick start

<!-- readme-example:quickstart -->
```ts
// Most consumers don't author integrations directly — they pull ready-made
// service descriptors from the registry and project them into tools:
import { integrationTools } from '@agentskit/integrations'

export const tools = integrationTools('slack', {
  credential: process.env.SLACK_BOT_TOKEN,
})
```

Service descriptors live under `src/services/`. The descriptor declares the
service's actions, triggers, auth, and `CONFIG_FIELDS`; the projection helpers
turn one descriptor into the surface each consumer needs (a `ToolDefinition`
for the runtime, a connect-form for an app, a webhook trigger, etc.).

The catalog is a **bundled, fetch-only** set of ~50 services (ADR-0012). The
OSS/AKOS product boundary is settled in [RFC 0003](../../rfcs/0003-oss-akos-boundary.md):
reusable connectors ship here in OSS; AKOS owns the commercial control plane
and consumes this package rather than re-shipping integrations.

## Authoring a new integration

```ts
import { defineIntegration, defineAction, httpJson } from '@agentskit/integrations'

export const myService = defineIntegration({
  name: 'my-service',
  baseUrl: 'https://api.example.com',
  actions: [
    defineAction({
      name: 'send',
      schema: { type: 'object', properties: { to: { type: 'string' } }, required: ['to'] },
      execute: (args, ctx) => httpJson(ctx, 'POST', '/send', args),
    }),
  ],
})
```

## Execution boundaries (resilience & security)

Projection and HTTP share a small set of safety contracts
([ADR-0026](../../docs/architecture/adrs/0026-integration-execution-boundaries.md)):

- **`HttpToolOptions.signal` / `ProjectionConfig.signal`** — caller cancellation composed with the per-request timeout.
- **Origin-confined auth-bound HTTP** — when `baseUrl` is set, `httpJson` rejects cross-origin paths and disables automatic redirects so bound credentials cannot leave that origin.
- **Derived confirmation** — projection forces `requiresConfirmation` for actions with `sideEffect` of `write`, `external`, or `destructive` (descriptors cannot opt out).
- **`ProjectionConfig.fetchUntrusted`** — policy-enforcing fetch for model-controlled URLs. Direct Whisper (and similar) consumers **must inject** an egress-policy fetch; the deprecated `@agentskit/tools` Whisper facade injects `safeFetch` independently of provider `fetch`.

## Stability

`beta` — usable in production; the descriptor, registry, and projection contract
are shipped, the fetch-only catalog is populated, and execution boundaries are
explicit (ADR-0026). Not yet `stable`: public surface may still move in minor
releases with CHANGELOG notes. Prefer `~x.y.z` if you need tighter pins.

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/integrations`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
