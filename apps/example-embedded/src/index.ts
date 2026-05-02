/**
 * apps/example-embedded — same agent runs from anywhere.
 *
 * `dev` (this file) is the canonical Node CLI invocation. Reads the
 * prompt from argv or stdin, runs a runtime, prints the result. The
 * Raycast Script Command at `raycast/agentskit-ask.ts` and the
 * VS Code task at `vscode/tasks.json` both call this same shape —
 * just packaged for those hosts.
 */

import { createRuntime } from '@agentskit/runtime'
import { openai } from '@agentskit/adapters'
import type { AdapterFactory } from '@agentskit/core'

function readStdin(): Promise<string> {
  return new Promise(resolve => {
    if (process.stdin.isTTY) return resolve('')
    let buf = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => (buf += chunk))
    process.stdin.on('end', () => resolve(buf))
  })
}

async function resolvePrompt(): Promise<string> {
  const arg = process.argv.slice(2).join(' ').trim()
  if (arg) return arg
  const piped = (await readStdin()).trim()
  return piped
}

function pickAdapter(): AdapterFactory {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    process.stderr.write('OPENAI_API_KEY not set; falling back to demo adapter.\n')
    return {
      createSource: () => ({
        stream: async function* () {
          yield { type: 'text' as const, content: '[demo] set OPENAI_API_KEY for a real reply.' }
          yield { type: 'done' as const }
        },
        abort: () => {},
      }),
    }
  }
  return openai({ apiKey, model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini' })
}

async function main() {
  const prompt = await resolvePrompt()
  if (!prompt) {
    process.stderr.write('Usage: agentskit-ask <prompt>\n   or: echo "..." | agentskit-ask\n')
    process.exit(2)
  }

  const runtime = createRuntime({
    adapter: pickAdapter(),
    systemPrompt: 'You are a concise coding assistant. Reply in plain text — no markdown headings.',
  })

  const result = await runtime.run(prompt)
  process.stdout.write(result.content + '\n')
}

main().catch(err => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
