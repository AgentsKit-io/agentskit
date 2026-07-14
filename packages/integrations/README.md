# @agentskit/integrations

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="../../apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

**Tags:** `agentskit` · `typescript` · `ai-agents`

[![stability](https://img.shields.io/badge/stability-alpha-orange)](../../docs/STABILITY.md)

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
import { defineIntegration, defineAction } from '@agentskit/integrations'

// Most consumers don't author integrations directly — they pull ready-made
// service descriptors from the registry and project them into tools:
import { registry, toTools } from '@agentskit/integrations'

const tools = toTools(registry.get('resend'))
```

Service descriptors live under `src/services/`. The descriptor declares the
service's actions, triggers, auth, and `CONFIG_FIELDS`; the projection helpers
turn one descriptor into the surface each consumer needs (a `ToolDefinition`
for the runtime, a connect-form for an app, a webhook trigger, etc.).

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

## Stability

`alpha` — the descriptor + registry contract is in place, but the catalog and
the OSS/AKOS split are still being decided (see `docs/studies/integrations-*.md`).
Pin exact and read the CHANGELOG on every update.

## Maturity and compatibility

- Stability: **alpha** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/integrations`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
