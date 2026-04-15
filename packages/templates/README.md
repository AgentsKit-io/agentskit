# @agentskit/templates

![stability: stable](https://img.shields.io/badge/stability-stable-brightgreen)

Create, validate, and scaffold custom AgentsKit extensions — tools, skills, and adapters — ready to publish and share.

## Why

- **Skip the boilerplate** — `scaffold()` generates a complete npm package with src, tests, tsconfig, and README in one call
- **Catch mistakes early** — `createToolTemplate()` validates required fields and gives clear error messages before your code runs
- **Extend, don't rewrite** — inherit from built-in skills/tools and override only what you need

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

## Next steps

- Publish your package to npm and depend on it from [`@agentskit/runtime`](https://www.npmjs.com/package/@agentskit/runtime) or [`useChat`](https://www.npmjs.com/package/@agentskit/react) like any other tool or skill
- Validate contracts against [`@agentskit/core`](https://www.npmjs.com/package/@agentskit/core) types early — templates align with those definitions

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ToolDefinition`, `SkillDefinition` |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Reference implementations |
| [@agentskit/skills](https://www.npmjs.com/package/@agentskit/skills) | Skills you can extend with `createSkillTemplate` |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Where custom tools/skills run |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
