# @agentskit/eval

<p align="center"><img src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" alt="AgentsKit" width="180" /></p>

Measure agent quality with numbers, not vibes — ship with confidence.

[![npm version](https://img.shields.io/npm/v/@agentskit/eval?color=blue)](https://www.npmjs.com/package/@agentskit/eval)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/eval)](https://www.npmjs.com/package/@agentskit/eval)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/eval?label=bundle)](https://bundlejs.com/?q=@agentskit/eval)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `eval` · `evaluation` · `benchmarking` · `testing` · `ci-cd` · `llm-testing`

## How this fits the ecosystem

@agentskit/eval is the quality layer: replay agent runs, compare outputs, snapshot behavior, and catch regressions before users do.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/eval) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why eval

- **Replace "it seemed to work" with real metrics** — accuracy, per-case latency, token cost, and pass/fail for every test case in a single result object
- **CI/CD ready** — exit codes reflect suite results; gate deployments on accuracy thresholds so regressions never reach production
- **Flexible assertions** — exact string matching, `includes` for LLM verbosity, or full control with a custom `(result) => boolean` function per case
- **Provider-agnostic** — the `agent` closure can wrap any async boundary: `createRuntime`, a custom controller, or an HTTP endpoint

## Install

```bash
npm install @agentskit/eval
```

## Quick example

```ts
import { runEval } from '@agentskit/eval'
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})

const result = await runEval({
  agent: async (input) => {
    const r = await runtime.run(input)
    return r.content
  },
  suite: {
    name: 'qa-baseline',
    cases: [
      { input: 'What is 2+2?', expected: '4' },
      { input: 'Capital of France?', expected: 'Paris' },
      { input: 'Is TypeScript a superset of JavaScript?', expected: (r) => r.toLowerCase().includes('yes') },
    ],
  },
})

console.log(`Accuracy: ${(result.accuracy * 100).toFixed(1)}%`)
console.log(`Passed: ${result.passed}/${result.totalCases}`)
```

## Features

- `runEval({ agent, suite })` — run a named test suite against any agent function
- Result: `{ accuracy, passed, totalCases, cases[] }` — per-case latency and outcome
- Assertion modes: exact match, `includes`, custom predicate
- CI exit codes — non-zero on failure for pipeline gating
- Pair with `@agentskit/observability` to trace failed cases

## Deterministic replay

Import recording, replay, cassette serialization, time travel, and comparison APIs from `@agentskit/eval/replay`. That entry is safe for Node, browsers, Expo, and React Native; browser and native package conditions exclude filesystem code.

Node applications that persist cassettes to disk should import `saveCassette` and `loadCassette` from the explicit Node-only subpath:

```ts
import { createCassette } from '@agentskit/eval/replay'
import { saveCassette, loadCassette } from '@agentskit/eval/replay/io'

await saveCassette('./fixtures/session.json', createCassette())
const cassette = await loadCassette('./fixtures/session.json')
```

The original Node exports from `@agentskit/eval/replay` remain available for compatibility. Browser and native hosts should combine `serializeCassette` or `parseCassette` with their own storage APIs.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Typical agent under test |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | Stable I/O contracts for eval harnesses |
| [@agentskit/observability](https://www.npmjs.com/package/@agentskit/observability) | Traces for failed cases |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)
