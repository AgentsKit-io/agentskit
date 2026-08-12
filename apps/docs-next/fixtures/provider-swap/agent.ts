import { pathToFileURL } from 'node:url'
import { anthropic, gemini, groq, ollama, openai, openrouter } from '@agentskit/adapters'
import type { AdapterFactory } from '@agentskit/core'
import { createRuntime } from '@agentskit/runtime'

export const PROVIDER_DEFAULTS = {
  openai: { envVar: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
  anthropic: { envVar: 'ANTHROPIC_API_KEY', model: 'claude-sonnet-4-6' },
  gemini: { envVar: 'GOOGLE_API_KEY', model: 'gemini-2.5-flash' },
  openrouter: { envVar: 'OPENROUTER_API_KEY', model: 'openrouter/free' },
  groq: { envVar: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile' },
  ollama: { envVar: null, model: 'llama3.2' },
} as const

export type LiveProvider = keyof typeof PROVIDER_DEFAULTS
export type Provider = LiveProvider | 'demo'
type ProviderEnv = Record<string, string | undefined>

const demoAdapter: AdapterFactory = {
  createSource(request) {
    const task = request.messages.at(-1)?.content ?? 'your task'

    return {
      async *stream() {
        yield { type: 'text' as const, content: `Demo model received: ${task}` }
        yield { type: 'done' as const }
      },
      abort() {},
    }
  },
}

function requiredApiKey(provider: Exclude<LiveProvider, 'ollama'>, env: ProviderEnv): string {
  const envVar = PROVIDER_DEFAULTS[provider].envVar
  const apiKey = env[envVar]
  if (!apiKey) throw new Error(`${envVar} is required for provider=${provider}`)
  return apiKey
}

export function selectAdapter(
  provider: Provider,
  env: ProviderEnv = process.env,
): AdapterFactory {
  if (provider === 'demo') return demoAdapter

  const model = env.AGENT_MODEL ?? PROVIDER_DEFAULTS[provider].model
  switch (provider) {
    case 'openai':
      return openai({ apiKey: requiredApiKey(provider, env), model })
    case 'anthropic':
      return anthropic({ apiKey: requiredApiKey(provider, env), model })
    case 'gemini':
      return gemini({ apiKey: requiredApiKey(provider, env), model })
    case 'openrouter':
      return openrouter({ apiKey: requiredApiKey(provider, env), model })
    case 'groq':
      return groq({ apiKey: requiredApiKey(provider, env), model })
    case 'ollama':
      return ollama({ model, baseUrl: env.OLLAMA_BASE_URL })
  }
}

export async function runTask(adapter: AdapterFactory, task: string) {
  const runtime = createRuntime({ adapter })
  return runtime.run(task)
}

export function providerFromEnv(value = process.env.AGENT_PROVIDER): Provider {
  if (value === undefined || value === 'demo') return 'demo'
  if (Object.hasOwn(PROVIDER_DEFAULTS, value)) return value as LiveProvider
  throw new Error(`Unsupported AGENT_PROVIDER: ${value}`)
}

async function main() {
  const provider = providerFromEnv()
  const result = await runTask(selectAdapter(provider), 'Explain why provider portability matters')
  console.log(`[${provider}] ${result.content}`)
}

const isMain = typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) void main()
