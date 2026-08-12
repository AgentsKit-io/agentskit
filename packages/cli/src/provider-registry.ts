/**
 * Static provider metadata consumed by the CLI doctor. This is deliberately
 * separate from the adapters catalog: doctor must stay deterministic and
 * must never fetch a catalog at runtime.
 */
export type ProviderRuntimeSupport = 'cli' | 'adapter-only' | 'local'

export type ProviderEnvConfig =
  | { status: 'required'; keys: readonly string[] }
  | { status: 'not-required'; reason: string }
  | { status: 'unsupported'; reason: string }

export type ProviderReachability =
  | { status: 'supported'; url: string }
  | { status: 'unsupported'; reason: string }

export type ProviderDefaultModel =
  | { status: 'known'; id: string }
  | { status: 'unsupported'; reason: string }

export interface ProviderRegistryEntry {
  id: string
  label: string
  runtime: ProviderRuntimeSupport
  /** Matching provider id in the committed adapters catalog, when present. */
  catalogId?: string
  env: ProviderEnvConfig
  reachability: ProviderReachability
  defaultModel: ProviderDefaultModel
  doctorDefault?: boolean
}

export const PROVIDER_REGISTRY = [
  {
    id: 'demo',
    label: 'Demo',
    runtime: 'local',
    env: { status: 'not-required', reason: 'Demo adapter does not use provider credentials.' },
    reachability: { status: 'unsupported', reason: 'Demo adapter has no upstream endpoint.' },
    defaultModel: { status: 'known', id: 'demo' },
  },
  {
    id: 'openai',
    label: 'OpenAI',
    runtime: 'cli',
    catalogId: 'openai',
    env: { status: 'required', keys: ['OPENAI_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.openai.com/v1/models' },
    defaultModel: { status: 'known', id: 'gpt-4o-mini' },
    doctorDefault: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    runtime: 'cli',
    catalogId: 'anthropic',
    env: { status: 'required', keys: ['ANTHROPIC_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.anthropic.com/v1/messages' },
    defaultModel: { status: 'known', id: 'claude-sonnet-4-6' },
    doctorDefault: true,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    runtime: 'cli',
    catalogId: 'google',
    env: { status: 'required', keys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'] },
    reachability: { status: 'supported', url: 'https://generativelanguage.googleapis.com/v1beta/models' },
    defaultModel: { status: 'known', id: 'gemini-2.5-flash' },
    doctorDefault: true,
  },
  {
    id: 'ollama',
    label: 'Ollama',
    runtime: 'local',
    env: { status: 'not-required', reason: 'Ollama runs locally and does not require an API key.' },
    reachability: { status: 'supported', url: 'http://localhost:11434/api/tags' },
    defaultModel: { status: 'known', id: 'llama3.1' },
    doctorDefault: true,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    runtime: 'cli',
    catalogId: 'deepseek',
    env: { status: 'required', keys: ['DEEPSEEK_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.deepseek.com/models' },
    defaultModel: { status: 'known', id: 'deepseek-chat' },
  },
  {
    id: 'grok',
    label: 'xAI Grok',
    runtime: 'cli',
    catalogId: 'xai',
    env: { status: 'required', keys: ['XAI_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.x.ai/v1/models' },
    defaultModel: { status: 'known', id: 'grok-4.20-0309-non-reasoning' },
  },
  {
    id: 'kimi',
    label: 'Kimi',
    runtime: 'cli',
    catalogId: 'moonshotai',
    env: { status: 'required', keys: ['KIMI_API_KEY', 'MOONSHOT_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.moonshot.ai/v1/models' },
    defaultModel: { status: 'known', id: 'kimi-k2-0711-preview' },
  },
  {
    id: 'groq',
    label: 'Groq',
    runtime: 'cli',
    catalogId: 'groq',
    env: { status: 'required', keys: ['GROQ_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.groq.com/openai/v1/models' },
    defaultModel: { status: 'known', id: 'openai/gpt-oss-120b' },
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    runtime: 'cli',
    catalogId: 'openrouter',
    env: { status: 'required', keys: ['OPENROUTER_API_KEY'] },
    reachability: { status: 'supported', url: 'https://openrouter.ai/api/v1/models' },
    defaultModel: { status: 'known', id: '~anthropic/claude-haiku-latest' },
  },
  {
    id: 'mistral',
    label: 'Mistral',
    runtime: 'adapter-only',
    catalogId: 'mistral',
    env: { status: 'required', keys: ['MISTRAL_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.mistral.ai/v1/models' },
    defaultModel: { status: 'known', id: 'codestral-latest' },
  },
  {
    id: 'cohere',
    label: 'Cohere',
    runtime: 'adapter-only',
    catalogId: 'cohere',
    env: { status: 'required', keys: ['COHERE_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.cohere.com/v1/models' },
    defaultModel: { status: 'known', id: 'c4ai-aya-expanse-32b' },
  },
  {
    id: 'together',
    label: 'Together',
    runtime: 'adapter-only',
    catalogId: 'togetherai',
    env: { status: 'required', keys: ['TOGETHER_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.together.xyz/v1/models' },
    defaultModel: { status: 'known', id: 'deepseek-ai/DeepSeek-R1' },
  },
  {
    id: 'fireworks',
    label: 'Fireworks',
    runtime: 'adapter-only',
    catalogId: 'fireworks-ai',
    env: { status: 'required', keys: ['FIREWORKS_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.fireworks.ai/inference/v1/models' },
    defaultModel: { status: 'known', id: 'accounts/fireworks/models/deepseek-v4-flash' },
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    runtime: 'adapter-only',
    catalogId: 'huggingface',
    env: { status: 'required', keys: ['HF_TOKEN'] },
    reachability: { status: 'supported', url: 'https://router.huggingface.co/v1/models' },
    defaultModel: { status: 'known', id: 'deepseek-ai/DeepSeek-R1-0528' },
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    runtime: 'local',
    catalogId: 'lmstudio',
    env: { status: 'not-required', reason: 'LM Studio runs locally and does not require a provider key.' },
    reachability: { status: 'supported', url: 'http://127.0.0.1:1234/v1/models' },
    defaultModel: { status: 'known', id: 'openai/gpt-oss-20b' },
  },
  {
    id: 'vllm',
    label: 'vLLM',
    runtime: 'local',
    env: { status: 'not-required', reason: 'vLLM is a local server and does not require a provider key.' },
    reachability: { status: 'supported', url: 'http://localhost:8000/v1/models' },
    defaultModel: { status: 'known', id: 'meta-llama/Llama-3.1-8B-Instruct' },
  },
  {
    id: 'llamacpp',
    label: 'llama.cpp',
    runtime: 'local',
    env: { status: 'not-required', reason: 'llama.cpp is a local server and does not require a provider key.' },
    reachability: { status: 'supported', url: 'http://localhost:8080/v1/models' },
    defaultModel: { status: 'known', id: 'local-model' },
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    runtime: 'adapter-only',
    catalogId: 'cerebras',
    env: { status: 'required', keys: ['CEREBRAS_API_KEY'] },
    reachability: { status: 'supported', url: 'https://api.cerebras.ai/v1/models' },
    defaultModel: { status: 'known', id: 'gpt-oss-120b' },
  },
] as const satisfies readonly ProviderRegistryEntry[]

export const DEFAULT_DOCTOR_PROVIDERS = PROVIDER_REGISTRY
  .filter(entry => 'doctorDefault' in entry && entry.doctorDefault === true)
  .map(entry => entry.id)

export function getProviderRegistryEntry(provider: string): ProviderRegistryEntry | undefined {
  return PROVIDER_REGISTRY.find(entry => entry.id === provider.toLowerCase())
}

/** Return an explicit unsupported profile instead of silently omitting a provider. */
export function resolveProviderRegistryEntry(provider: string): ProviderRegistryEntry {
  return getProviderRegistryEntry(provider) ?? {
    id: provider,
    label: provider,
    runtime: 'adapter-only',
    env: { status: 'unsupported', reason: 'Provider is not in the CLI doctor registry.' },
    reachability: { status: 'unsupported', reason: 'Provider is not in the CLI doctor registry.' },
    defaultModel: { status: 'unsupported', reason: 'Provider is not in the CLI doctor registry.' },
  }
}
