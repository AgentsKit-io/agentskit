/**
 * durable.ts — Temporal-style step log. Each side-effect step records
 * its result. On retry, recorded steps short-circuit; only the unfinished
 * tail re-executes.
 *
 * Run once:        pnpm --filter @agentskit/example-runtime dev:durable
 * Run again:       same command — second run replays.
 * Wipe + retry:    pnpm --filter @agentskit/example-runtime dev:durable -- --reset
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDurableRunner, createFileStepLog } from '@agentskit/runtime'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORE_PATH = resolve(__dirname, '../.agentskit/durable.jsonl')

const reset = process.argv.includes('--reset')
const store = await createFileStepLog(STORE_PATH)

const runId = 'demo-run'
if (reset) await store.clear?.(runId)

const runner = createDurableRunner({
  store,
  runId,
  onEvent: event => {
    if (event.type === 'step:replay') process.stderr.write(`▸ ${event.stepId} replayed (cached)\n`)
    if (event.type === 'step:start')   process.stderr.write(`▸ ${event.stepId} start\n`)
    if (event.type === 'step:success') process.stderr.write(`✓ ${event.stepId} (${event.durationMs}ms)\n`)
  },
})

process.stderr.write(`store=${STORE_PATH}${reset ? ' (cleared)' : ''}\n\n`)

// Each call is N seconds of "work". Re-running the script re-uses
// any successful prior step from the JSONL log.
const research = await runner.step('research', async () => {
  await new Promise(r => setTimeout(r, 800))
  return { topic: 'AI safety', sources: 3 }
})

const summary = await runner.step('summarize', async () => {
  await new Promise(r => setTimeout(r, 600))
  return `Summary based on ${research.sources} sources about ${research.topic}.`
})

const sent = await runner.step('email', async () => {
  await new Promise(r => setTimeout(r, 400))
  return { to: 'team@example.com', length: summary.length }
})

process.stdout.write(`\n${summary}\n`)
process.stderr.write(`\nemail: ${JSON.stringify(sent)}\n`)
process.stderr.write(`Re-run the script — the three steps replay instantly from the log.\n`)
