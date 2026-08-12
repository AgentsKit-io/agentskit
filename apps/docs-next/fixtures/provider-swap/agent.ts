import { openrouter } from '@agentskit/adapters'
import type { AdapterFactory } from '@agentskit/core'
import { createRuntime } from '@agentskit/runtime'

type Provider = 'local' | 'openrouter'

const localAdapter: AdapterFactory = {
  createSource(request) {
    const task = request.messages.at(-1)?.content ?? 'your task'

    return {
      async *stream() {
        yield { type: 'text' as const, content: `Local model received: ${task}` }
        yield { type: 'done' as const }
      },
      abort() {},
    }
  },
}

export function selectAdapter(
  provider: Provider,
  openRouterApiKey = process.env.OPENROUTER_API_KEY,
): AdapterFactory {
  if (provider === 'local') return localAdapter
  if (!openRouterApiKey) throw new Error('OPENROUTER_API_KEY is required for provider=openrouter')
  return openrouter({ apiKey: openRouterApiKey, model: 'openrouter/free' })
}

export async function runTask(adapter: AdapterFactory, task: string) {
  const runtime = createRuntime({ adapter })
  return runtime.run(task)
}

function providerFromEnv(value = process.env.AGENT_PROVIDER): Provider {
  if (value === undefined || value === 'local') return 'local'
  if (value === 'openrouter') return 'openrouter'
  throw new Error(`Unsupported AGENT_PROVIDER: ${value}`)
}

async function main() {
  const provider = providerFromEnv()
  const result = await runTask(selectAdapter(provider), 'Explain why provider portability matters')
  console.log(`[${provider}] ${result.content}`)
}

void main()
