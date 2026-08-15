import type { AdapterFactory } from '@agentskit/core'
import { createRuntime } from '@agentskit/runtime'

const OUTPUTS = {
  support: 'Support escalation draft: sanitized evidence, missing reproduction video, human review required.',
  api: 'API contract review: one breaking field change, one affected consumer, runtime fixture required.',
  facts: 'Claim review: one supplied claim supported, production-readiness claim unresolved, editorial review required.',
} as const

type PatternId = keyof typeof OUTPUTS

function patternFor(prompt: string): PatternId {
  if (prompt.includes('API')) return 'api'
  if (prompt.includes('claim')) return 'facts'
  return 'support'
}

const localAdapter: AdapterFactory = {
  createSource(request) {
    const prompt = request.messages.at(-1)?.content ?? ''
    const result = OUTPUTS[patternFor(prompt)]

    return {
      async *stream() {
        yield { type: 'text' as const, content: result }
        yield { type: 'done' as const }
      },
      abort() {},
    }
  },
}

async function main() {
  const runtime = createRuntime({ adapter: localAdapter })
  const prompts = [
    'Run a support escalation draft',
    'Run an API contract review',
    'Run a claim fact-check',
  ]

  for (const prompt of prompts) {
    const result = await runtime.run(prompt)
    console.log(result.content)
  }
}

void main()
