# @agentskit/skills

Pre-tuned agent personas that work out of the box — skills are what your agent IS, tools are what it CAN DO.

[![npm version](https://img.shields.io/npm/v/@agentskit/skills?color=blue)](https://www.npmjs.com/package/@agentskit/skills)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/skills)](https://www.npmjs.com/package/@agentskit/skills)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/skills)](https://bundlephobia.com/package/@agentskit/skills)
[![license](https://img.shields.io/npm/l/@agentskit/skills)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-stable-brightgreen)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/EmersonBraun/agentskit?style=social)](https://github.com/EmersonBraun/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `autonomous-agents` · `prompts` · `prompt-engineering` · `personas` · `multi-agent`

## Why skills

- **Skip prompt engineering** — `researcher`, `coder`, `planner`, `critic`, and `summarizer` are battle-tested behavioral profiles; activate one and your agent immediately behaves like a specialist
- **Composable by design** — combine skills with `composeSkills` to merge prompts, tools, and delegates; build a research-and-code pipeline in one line
- **Multi-agent delegation built in** — the `planner` skill knows how to coordinate `researcher` and `coder` as sub-agents, so you get multi-agent workflows without writing orchestration code
- **Extend without starting over** — override just `systemPrompt` or `temperature` on top of an existing skill via `@agentskit/templates`

## Install

```bash
npm install @agentskit/skills
```

## Quick example

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { researcher, coder, composeSkills } from '@agentskit/skills'
import { webSearch, filesystem } from '@agentskit/tools'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  tools: [webSearch(), ...filesystem({ basePath: './workspace' })],
})

const result = await runtime.run('Research best practices for TypeScript error handling and write an example', {
  skill: composeSkills(researcher, coder),
})
console.log(result.content)
```

## Features

- Built-in skills: `researcher`, `coder`, `planner`, `critic`, `summarizer`
- `composeSkills(...skills)` — merge system prompts and behavioral defaults
- Skill contract v1 (ADR 0005): `{ name, description, systemPrompt }`
- Works with `@agentskit/runtime`, `useChat`, and the CLI `--skill` flag
- Fork and override with `@agentskit/templates` `createSkillTemplate`

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime`, `skill` option |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Tools skills orchestrate |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM backends |
| [@agentskit/templates](https://www.npmjs.com/package/@agentskit/templates) | `createSkillTemplate`, `scaffold` |

## Contributors

<a href="https://github.com/EmersonBraun/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=EmersonBraun/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/EmersonBraun/agentskit)
