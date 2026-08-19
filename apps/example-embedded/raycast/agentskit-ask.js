#!/usr/bin/env node
// Required Raycast metadata. The header is parsed by Raycast on
// install — do not move the comments. See:
// https://developers.raycast.com/basics/script-commands

// @raycast.schemaVersion 1
// @raycast.title Ask AgentsKit
// @raycast.mode fullOutput
// @raycast.icon 🤖
// @raycast.packageName AgentsKit
// @raycast.argument1 { "type": "text", "placeholder": "Question for the agent" }
// @raycast.author AgentsKit
// @raycast.authorURL https://www.agentskit.io
// @raycast.description Ask the AgentsKit demo agent a question. Streams the answer to Raycast's full-output pane.

/**
 * Raycast Script Command. Reads the user's argument, runs an
 * AgentsKit runtime against OPENAI_API_KEY (or a demo fallback),
 * and prints the answer. The sibling package.json uses published
 * dependencies so this folder can be copied outside the monorepo.
 */

import { createRuntime } from '@agentskit/runtime'
import { openai } from '@agentskit/adapters'

function pickAdapter() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      createSource: () => ({
        stream: async function* () {
          yield { type: 'text', content: '[demo] set OPENAI_API_KEY in Raycast → Extensions → AgentsKit to get real replies.' }
          yield { type: 'done' }
        },
        abort: () => {},
      }),
    }
  }
  return openai({ apiKey, model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini' })
}

const prompt = process.argv.slice(2).join(' ').trim()
if (!prompt) {
  process.stderr.write('Usage: agentskit-ask "<prompt>"\n')
  process.exit(2)
}

const runtime = createRuntime({
  adapter: pickAdapter(),
  systemPrompt: 'You are a concise coding assistant. Reply in plain text — no markdown headings.',
})

runtime.run(prompt).then(
  result => process.stdout.write(result.content + '\n'),
  err => {
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  },
)
