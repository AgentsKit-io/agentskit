import {
  ALL_SCORERS,
  detectRegressions,
  formatAlertsMarkdown,
  runBraintrustEval,
  type ExperimentResult,
} from '@agentskit/eval/braintrust'
import { dataset } from './dataset'
import { loadPrompt, makeAgent, type PromptVariant } from './agent'

const skipUpload = { init: async () => { throw new Error('skip upload in showcase') } }

async function runVariant(variant: PromptVariant): Promise<ExperimentResult> {
  const prompt = loadPrompt(variant)
  process.stdout.write(`\n[${variant}] prompt loaded (${prompt.length} chars)\n`)
  const agent = makeAgent(variant)
  return runBraintrustEval({
    cases: dataset.map(c => ({
      input: c.input,
      output: '',
      expected: c.expected,
      metadata: c.metadata,
    })),
    agent,
    scorers: ALL_SCORERS,
    options: { projectName: 'agentskit-dspy-showcase', experimentName: variant },
  }, { bt: skipUpload })
}

const fmtPct = (n: number): string => `${(n * 100).toFixed(1)}%`

function arrowFor(delta: number): string {
  if (delta > 0.001) return '▲'
  if (delta < -0.001) return '▼'
  return '·'
}

function renderTable(baseline: ExperimentResult, optimized: ExperimentResult): string {
  const allScorers = new Set([
    ...Object.keys(baseline.summary),
    ...Object.keys(optimized.summary),
  ])
  const rows = [...allScorers].sort().map(s => {
    const b = baseline.summary[s]?.mean ?? 0
    const o = optimized.summary[s]?.mean ?? 0
    const delta = o - b
    const arrow = arrowFor(delta)
    return `| ${s.padEnd(24)} | ${fmtPct(b).padStart(7)} | ${fmtPct(o).padStart(7)} | ${arrow} ${(delta >= 0 ? '+' : '') + fmtPct(delta)} |`
  })
  return [
    '',
    '| Scorer                   | Baseline | DSPy   | Δ           |',
    '|--------------------------|----------|--------|-------------|',
    ...rows,
    '',
  ].join('\n')
}

async function main(): Promise<void> {
  process.stdout.write('AgentsKit × DSPy showcase — baseline vs DSPy-optimized prompts\n')
  process.stdout.write('================================================================\n')

  const baseline = await runVariant('baseline')
  const optimized = await runVariant('optimized')

  process.stdout.write('\n## Side-by-side scores\n')
  process.stdout.write(renderTable(baseline, optimized))

  const regressionsAgainstOptimized = detectRegressions(
    optimized.summary,
    baseline.summary,
    { default: 0.1 },
  )
  process.stdout.write('\n## Regression check (baseline vs DSPy-optimized)\n\n')
  process.stdout.write(formatAlertsMarkdown(regressionsAgainstOptimized))
  process.stdout.write('\n\n')

  const improvedScorers = Object.keys(optimized.summary).filter(s => {
    const b = baseline.summary[s]?.mean ?? 0
    const o = optimized.summary[s]?.mean ?? 0
    return o - b > 0.001
  })
  process.stdout.write(`Optimized prompt improved ${improvedScorers.length} scorers: ${improvedScorers.join(', ') || 'none'}\n`)

  if (improvedScorers.length === 0) {
    process.exitCode = 1
  }
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
