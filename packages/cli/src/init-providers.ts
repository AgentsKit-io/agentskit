export type Provider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'ollama'
  | 'deepseek'
  | 'grok'
  | 'kimi'
  | 'groq'
  | 'openrouter'
  | 'demo'

export const PROVIDER_IMPORT: Record<Exclude<Provider, 'demo'>, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  gemini: 'gemini',
  ollama: 'ollama',
  deepseek: 'deepseek',
  grok: 'grok',
  kimi: 'kimi',
  groq: 'groq',
  openrouter: 'openrouter',
}

export const PROVIDER_DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
  gemini: 'gemini-2.5-flash',
  ollama: 'llama3.1',
  deepseek: 'deepseek-chat',
  grok: 'grok-4.20-0309-non-reasoning',
  kimi: 'kimi-k2-0711-preview',
  groq: 'openai/gpt-oss-120b',
  openrouter: '~anthropic/claude-haiku-latest',
  demo: 'demo',
}

export const PROVIDER_ENV_KEY: Record<Provider, string | null> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  ollama: null,
  deepseek: 'DEEPSEEK_API_KEY',
  grok: 'XAI_API_KEY',
  kimi: 'KIMI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  demo: null,
}
