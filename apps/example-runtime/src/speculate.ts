/**
 * speculate.ts — race two adapters, take whichever finishes first.
 *
 * Run:  pnpm --filter @agentskit/example-runtime dev:speculate
 *
 * Mocks two adapters with deliberately different latencies + outputs.
 * The default 'first' picker takes whatever streams to completion
 * first; loser is aborted as soon as the winner settles.
 */

import { speculate } from '@agentskit/runtime'
import type { AdapterFactory } from '@agentskit/core'

function fakeAdapter(name: string, delayMs: number, text: string): AdapterFactory {
  return {
    createSource: () => {
      let aborted = false
      return {
        stream: async function* () {
          for (const word of text.split(' ')) {
            if (aborted) return
            await new Promise(r => setTimeout(r, delayMs))
            yield { type: 'text' as const, content: word + ' ' }
          }
          yield { type: 'done' as const }
        },
        abort: () => {
          aborted = true
          process.stderr.write(`  ✗ ${name} aborted (lost the race)\n`)
        },
      }
    },
  }
}

const result = await speculate({
  candidates: [
    { id: 'fast-cheap', adapter: fakeAdapter('fast-cheap', 30, 'Fast model output landed first.') },
    { id: 'slow-deep',  adapter: fakeAdapter('slow-deep',  70, 'Slower more thoughtful response that loses the race.') },
  ],
  request: { messages: [], context: undefined } as never,
})

process.stderr.write(`\n— winner: ${result.winner.id} (${result.winner.latencyMs}ms) —\n`)
process.stdout.write(`${result.winner.text.trim()}\n`)
process.stderr.write(`\nLoser results:\n`)
for (const loser of result.losers) {
  process.stderr.write(`  ${loser.id}: ${loser.aborted ? 'aborted' : 'finished'} after ${loser.latencyMs}ms\n`)
}
