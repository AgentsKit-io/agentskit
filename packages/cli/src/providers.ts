import {
  anthropic,
  deepseek,
  gemini,
  groq,
  grok,
  kimi,
  ollama,
  openai,
  openrouter,
} from '@agentskit/adapters'
import type { AdapterFactory } from '@agentskit/core'

export interface ChatProviderOptions {
  provider: string
  model?: string
  apiKey?: string
  baseUrl?: string
}

export interface ResolvedChatProvider {
  adapter: AdapterFactory
  provider: string
  model?: string
  mode: 'demo' | 'live'
  summary: string
}

interface ProviderEntry {
  label: string
  envKeys: string[]
  defaultModel?: string
  requiresModel?: boolean
  factory: (config: { apiKey: string; model: string; baseUrl?: string }) => AdapterFactory
}

const providers: Record<string, ProviderEntry> = {
  openai: {
    label: 'OpenAI',
    envKeys: ['OPENAI_API_KEY'],
    defaultModel: 'gpt-4o-mini',
    factory: (c) => openai(c),
  },
  anthropic: {
    label: 'Anthropic',
    envKeys: ['ANTHROPIC_API_KEY'],
    defaultModel: 'claude-3-5-sonnet-latest',
    factory: (c) => anthropic(c),
  },
  gemini: {
    label: 'Gemini',
    envKeys: ['GEMINI_API_KEY'],
    defaultModel: 'gemini-2.5-flash',
    factory: (c) => gemini(c),
  },
  ollama: {
    label: 'Ollama',
    envKeys: [],
    defaultModel: 'llama3.1',
    factory: (c) => ollama({ model: c.model, baseUrl: c.baseUrl }),
  },
  deepseek: {
    label: 'DeepSeek',
    envKeys: ['DEEPSEEK_API_KEY'],
    defaultModel: 'deepseek-chat',
    factory: (c) => deepseek(c),
  },
  grok: {
    label: 'xAI Grok',
    envKeys: ['XAI_API_KEY'],
    requiresModel: true,
    factory: (c) => grok(c),
  },
  kimi: {
    label: 'Kimi',
    envKeys: ['KIMI_API_KEY', 'MOONSHOT_API_KEY'],
    requiresModel: true,
    factory: (c) => kimi(c),
  },
  groq: {
    label: 'Groq',
    envKeys: ['GROQ_API_KEY'],
    defaultModel: 'openai/gpt-oss-120b',
    factory: (c) => groq(c),
  },
  openrouter: {
    label: 'OpenRouter',
    envKeys: ['OPENROUTER_API_KEY'],
    defaultModel: '~anthropic/claude-haiku-latest',
    factory: (c) => openrouter(c),
  },
}

function createDemoAdapter(provider: string, model?: string): AdapterFactory {
  return {
    createSource: ({ messages }) => {
      let cancelled = false

      return {
        stream: async function* () {
          const userMessages = messages.filter(message => message.role === 'user')
          const lastMessage = userMessages[userMessages.length - 1]
          const reply = [
            `Provider: ${provider}${model ? ` (${model})` : ''}.`,
            'This is the AgentsKit CLI demo adapter.',
            `You said: ${lastMessage?.content ?? ''}`,
          ].join(' ')

          for (const chunk of reply.match(/.{1,18}/g) ?? []) {
            if (cancelled) return
            await new Promise(resolve => setTimeout(resolve, 35))
            yield { type: 'text' as const, content: chunk }
          }

          yield { type: 'done' as const }
        },
        abort: () => {
          cancelled = true
        },
      }
    },
  }
}

export function resolveChatProvider(options: ChatProviderOptions): ResolvedChatProvider {
  const name = options.provider.toLowerCase()

  if (name === 'demo') {
    return {
      adapter: createDemoAdapter(name, options.model),
      provider: name,
      model: options.model,
      mode: 'demo',
      summary: 'demo adapter (no network, no API key required)',
    }
  }

  const entry = providers[name]
  if (!entry) {
    const supported = ['demo', ...Object.keys(providers)].join(', ')
    throw new Error(`Unsupported provider "${options.provider}". Try ${supported}.`)
  }

  // Resolve API key: try explicit flag first, then each envKey in order
  let apiKey = options.apiKey
  if (!apiKey) {
    for (const key of entry.envKeys) {
      apiKey = process.env[key]
      if (apiKey) break
    }
  }
  if (!apiKey && entry.envKeys.length > 0) {
    const keyList = entry.envKeys.join(' or ')
    throw new Error(`${entry.label} requires an API key. Pass --api-key or set ${keyList}.`)
  }

  // Resolve model
  const model = options.model ?? entry.defaultModel
  if (!model) {
    throw new Error(`${entry.label} requires --model in the current CLI version.`)
  }

  return {
    adapter: entry.factory({ apiKey: apiKey ?? '', model, baseUrl: options.baseUrl }),
    provider: name,
    model,
    mode: 'live',
    summary: `${entry.label} live adapter`,
  }
}
