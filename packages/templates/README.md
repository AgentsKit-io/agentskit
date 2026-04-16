# @agentskit/templates

Create, validate, and scaffold custom AgentsKit extensions — tools, skills, and adapters — ready to publish and share.

[![npm version](https://img.shields.io/npm/v/@agentskit/templates?color=blue)](https://www.npmjs.com/package/@agentskit/templates)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/templates)](https://www.npmjs.com/package/@agentskit/templates)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/templates)](https://bundlephobia.com/package/@agentskit/templates)
[![license](https://img.shields.io/npm/l/@agentskit/templates)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-stable-brightgreen)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/EmersonBraun/agentskit?style=social)](https://github.com/EmersonBraun/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `scaffolding` · `templates` · `authoring` · `plugin` · `extension`

## Why templates

- **Skip the boilerplate** — `scaffold()` generates a complete npm package with src, tests, tsconfig, and README in one call
- **Catch mistakes early** — `createToolTemplate()` validates required fields and gives clear error messages before your code runs
- **Extend, don't rewrite** — inherit from built-in skills/tools and override only what you need
- **Publish-ready output** — scaffolded packages include the correct tsup config, dual CJS/ESM exports, and a contract test

## Install

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
})
```

## Scaffold a full package

```ts
import { scaffold } from '@agentskit/templates'

await scaffold({
  type: 'tool',       // 'tool' | 'skill' | 'adapter'
  name: 'my-search',
  dir: './packages',
  description: 'Custom search tool for AgentsKit',
})
// → packages/my-search/
//     package.json, tsconfig.json, tsup.config.ts
//     src/index.ts (template with ToolDefinition)
//     tests/index.test.ts (contract test)
//     README.md
```

## Features

- `createToolTemplate` — validated tool factory with type-safe schema
- `createSkillTemplate` — extend built-in skills with overrides
- `scaffold({ type, name, dir })` — generate a complete npm package ready to publish
- All outputs align with `@agentskit/core` contracts — no manual ADR compliance required

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ToolDefinition`, `SkillDefinition` |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Reference implementations |
| [@agentskit/skills](https://www.npmjs.com/package/@agentskit/skills) | Skills you can extend with `createSkillTemplate` |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Where custom tools/skills run |

## Contributors

<a href="https://github.com/EmersonBraun/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=EmersonBraun/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/EmersonBraun/agentskit)
