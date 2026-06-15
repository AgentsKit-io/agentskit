# @agentskit/integrations

[![stability](https://img.shields.io/badge/stability-alpha-orange)](../../docs/STABILITY.md)

Unified, plug-and-play service integrations for AgentsKit agents — one descriptor
per service, projected into tools, connectors, triggers, and auth. Every
integration is HTTP/`fetch`-only: no vendor SDKs are bundled or required
(see [ADR-0012](../../docs/architecture/adrs/0012-vendor-adapter-scope.md)).

## Install

```sh
npm install @agentskit/integrations
```

## Quick start

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
