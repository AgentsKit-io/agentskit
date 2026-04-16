# @agentskit/eval

Measure agent quality with numbers, not vibes — ship with confidence.

[![npm version](https://img.shields.io/npm/v/@agentskit/eval?color=blue)](https://www.npmjs.com/package/@agentskit/eval)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/eval)](https://www.npmjs.com/package/@agentskit/eval)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/eval)](https://bundlephobia.com/package/@agentskit/eval)
[![license](https://img.shields.io/npm/l/@agentskit/eval)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/EmersonBraun/agentskit?style=social)](https://github.com/EmersonBraun/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `eval` · `evaluation` · `benchmarking` · `testing` · `ci-cd` · `llm-testing`

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

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Typical agent under test |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | Stable I/O contracts for eval harnesses |
| [@agentskit/observability](https://www.npmjs.com/package/@agentskit/observability) | Traces for failed cases |

## Contributors

<a href="https://github.com/EmersonBraun/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=EmersonBraun/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/EmersonBraun/agentskit)
