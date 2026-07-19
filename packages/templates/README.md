# @agentskit/templates

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Create, validate, and scaffold custom AgentsKit extensions — tools, skills,
adapters, memory backends, embedders, and flows — ready to customize, build,
and publish.

[![npm version](https://img.shields.io/npm/v/@agentskit/templates?color=blue)](https://www.npmjs.com/package/@agentskit/templates)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/templates)](https://www.npmjs.com/package/@agentskit/templates)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/templates?label=bundle)](https://bundlejs.com/?q=@agentskit/templates)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `scaffolding` · `templates` · `authoring` · `plugin` · `extension`

## Verified proof

- Package metadata and tests live under `packages/templates/`.
- Package guide: https://www.agentskit.io/docs/packages/templates
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/templates helps you create new AgentsKit skills, tools, adapters,
and package starters without inventing package shape from scratch.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/templates) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why templates

- **Skip the boilerplate** — `scaffold()` generates a complete npm package with src, tests, tsconfig, and README in one call
- **Safe by default** — validates names, refuses symlink destinations, stages atomically, and fails on collisions unless `overwrite: true`
- **Catch mistakes early** — `createToolTemplate()` validates required fields before your code runs
- **Extend, don't rewrite** — inherit from built-in skills/tools and override only what you need
- **Build-ready output** — compilable skeletons with dual CJS/ESM, `engines.node >=20`, MIT, and caret-pinned AgentsKit deps

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/templates
```

## Create a custom tool

```ts
import { createToolTemplate } from '@agentskit/templates'

const slackTool = createToolTemplate({
  name: 'slack-notify',
  description: 'Send a message to a Slack channel',
  schema: {
    type: 'object',
    properties: {
      channel: { type: 'string' },
      message: { type: 'string' },
    },
    required: ['channel', 'message'],
  },
  execute: async (args) => {
    await fetch(webhookUrl, { method: 'POST', body: JSON.stringify({ channel: args.channel, text: args.message }) })
    return `Sent to #${args.channel}`
  },
})
```

## Extend a built-in skill

```ts
import { createSkillTemplate } from '@agentskit/templates'
import { researcher } from '@agentskit/skills'

const myResearcher = createSkillTemplate({
  base: researcher,
  name: 'my-researcher',
  systemPrompt: researcher.systemPrompt + '\nAlways cite sources with URLs.',
  temperature: 0.3,
  metadata: { team: 'research' },
})
```

## Scaffold a full package

Eight shapes: `tool`, `skill`, `adapter`, `memory-vector`, `memory-chat`,
`flow`, `embedder`, `browser-adapter`.

```ts
import { scaffold } from '@agentskit/templates'

await scaffold({
  type: 'tool',
  name: 'my-search',          // unscoped kebab-case only
  dir: './packages',
  description: 'Custom search tool for AgentsKit',
  // overwrite: true,         // default false — existing dirs fail safely
})
// → packages/my-search/
//     package.json, tsconfig.json, tsup.config.ts
//     src/index.ts (named export ToolDefinition factory)
//     tests/index.test.ts (contract test)
//     README.md
```

**Not the same as `agentskit init`.** The CLI bootstraps full apps with its own
templates. This package is the programmatic authoring toolkit for extension
packages (tools, skills, adapters, …).

### Name & security notes

- Names must be unscoped npm-safe kebab-case (`my-search`). Scoped packages
  (`@org/pkg`) are not supported in this beta — migration will land in a later
  minor if needed.
- Destinations are staged then renamed atomically; symlink destination roots are refused;
  collisions fail unless you pass `overwrite: true`.

## Features

- `createToolTemplate` / `createSkillTemplate` / `createAdapterTemplate` — validated factories
- `scaffold({ type, name, dir, overwrite? })` — generate a complete npm package
- `validateToolTemplate` / `validateSkillTemplate` / `validateAdapterTemplate`
- `SCAFFOLD_TYPES`, `validateScaffoldConfig`
- Outputs align with `@agentskit/core` contracts (JSON Schema, not Zod)

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ToolDefinition`, `SkillDefinition`, `AdapterFactory` |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Reference tool implementations |
| [@agentskit/skills](https://www.npmjs.com/package/@agentskit/skills) | Skills you can extend with `createSkillTemplate` |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Where custom tools/skills run; flow scaffolds depend on it |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Quick start

<!-- readme-example:quickstart -->
```ts
import { createToolTemplate } from '@agentskit/templates'

const echo = createToolTemplate({
  name: 'echo',
  description: 'Echo a string back',
  schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  execute: async (args) => String(args.text),
})

console.log(echo.name)
```

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/templates`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
