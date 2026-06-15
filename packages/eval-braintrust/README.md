# `@agentskit/eval-braintrust`

[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)

Braintrust scoring pipeline for AgentsKit. Ships **8 scorers** in two families and a thin runner that uploads results to a [Braintrust](https://www.braintrust.dev/) experiment.

- **Quality scorers** — task success, factual grounding, citation correctness, tool-arg validity
- **Robustness scorers** — schema survival, HITL gate correctness, fallback resilience, no-crash survival

## Install

```sh
npm install @agentskit/eval-braintrust braintrust
```

`braintrust` is loaded lazily — install it alongside.

## Quick start

```ts
import {
  runBraintrustEval,
  qualityFamily,
  robustnessFamily,
} from '@agentskit/eval-braintrust'

const result = await runBraintrustEval({
  cases: [
    { input: 'What is the capital of France?', output: '', expected: 'Paris' },
  ],
  agent: async input => {
    const r = await myAgent.run(input)
    return { output: r.text, metadata: { toolCalls: r.toolCalls } }
  },
  scorers: [...qualityFamily.scorers, ...robustnessFamily.scorers],
  options: {
    projectName: 'agentskit-showcase',
    experimentName: `pr-${process.env.GITHUB_PR_NUMBER ?? 'local'}`,
  },
})

console.log(result.summary)
console.log(result.url) // public Braintrust experiment URL
```

If `BRAINTRUST_API_KEY` is missing or the SDK is not installed, the runner still computes scores locally and returns them — useful for local iteration without uploads.

## CI regression alerts

```ts
import { detectRegressions, formatAlertsMarkdown } from '@agentskit/eval-braintrust/ci'

const alerts = detectRegressions(baselineSummary, currentSummary, { default: 0.05 })
process.stdout.write(formatAlertsMarkdown(alerts))
if (alerts.length > 0) process.exit(1)
```

Wire into a GitHub Actions step that posts the comment on the PR.

## Adding a custom scorer

```ts
import type { Scorer } from '@agentskit/eval-braintrust'

const verbosityPenalty: Scorer = ({ output }) => ({
  name: 'verbosity_penalty',
  score: output.length < 1000 ? 1 : Math.max(0, 1 - (output.length - 1000) / 5000),
})
```

Pass it alongside the bundled scorers in `runBraintrustEval({ scorers: [...] })`.

## Scorer design rationale

Scorers are pure functions returning a `[0, 1]` score. They never call out to model APIs themselves — that lives in the agent under test. This keeps scorers fast, deterministic in unit tests, and trivially portable across runtimes.

Robustness scorers read fields from the case `metadata` (e.g. `parseError`, `hitlTriggered`, `fallbackFired`) that the agent's wrapper is expected to populate. The contract is documented per scorer in `src/scorers/`.

## License

MIT
