# @agentskit/skills

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Reusable agent personas and behavioral instructions — skills describe what your agent IS, while tools describe what it CAN DO.

[![npm version](https://img.shields.io/npm/v/@agentskit/skills?color=blue)](https://www.npmjs.com/package/@agentskit/skills)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/skills)](https://www.npmjs.com/package/@agentskit/skills)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/skills?label=bundle)](https://bundlejs.com/?q=@agentskit/skills)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `autonomous-agents` · `prompts` · `prompt-engineering` · `personas` · `multi-agent`

## Verified proof

- Package metadata and tests live under `packages/skills/`.
- Package guide: https://www.agentskit.io/docs/packages/skills
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/skills packages reusable agent behavior: prompts, personas, task patterns, and marketplace-ready capabilities.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/skills) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why skills

- **Contract-tested catalog** — 26 built-ins share one ADR 0005 harness for names, prompts, examples, serialization, and declarative references
- **Composable by design** — `composeSkills` defensively combines prompts, tools, delegates, examples, temperature, metadata, and activation hooks
- **Explicit runtime wiring** — `tools` and `delegates` are names, not executable implementations; provide matching registries to the runtime or orchestrator that activates the skill
- **Extend without starting over** — override just `systemPrompt` or `temperature` on top of an existing skill via `@agentskit/templates`

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/skills
```

## Quick example

<!-- readme-example:quickstart -->
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

- 26 built-in skills across general, engineering, data, support, healthcare, finance, legal, education, e-commerce, and real-estate use cases
- `getBuiltinSkills()` / `listSkills()` — defensive full-definition and metadata discovery
- `composeSkills(...skills)` — validated, deterministic composition with S1-compatible names
- `createSkillRegistry()` — isolated in-memory publish/list/install/unpublish boundary with strict SemVer validation
- Skill contract v1 (ADR 0005): `{ name, description, systemPrompt }`
- Works with `@agentskit/runtime`, `useChat`, and the CLI `--skill` flag
- Fork and override with `@agentskit/templates` `createSkillTemplate`

The package does not automatically resolve tool names or execute delegates. Those
references become capabilities only when the consuming runtime supplies the
corresponding tool and skill registries.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime`, `skill` option |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Tools skills orchestrate |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM backends |
| [@agentskit/templates](https://www.npmjs.com/package/@agentskit/templates) | `createSkillTemplate`, `scaffold` |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- Stable-ready implementation work is tracked in [RFC 0009](../../rfcs/0009-skills-stable.md); promotion still requires the elapsed release evidence in ADR 0024
- **Node.js 22+** and **TypeScript** strict mode
- Published as `@agentskit/skills`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
