'use client'

/**
 * Shared stack selection state. Every learn page, the stack builder, and any
 * other surface that shows framework / provider / memory / package-manager
 * choices reads and writes through these hooks. Selections persist in
 * localStorage and sync across tabs + sibling components via CustomEvent.
 */

import { useSyncExternalStore } from 'react'

export type Framework =
  | 'react'
  | 'vue'
  | 'svelte'
  | 'solid'
  | 'angular'
  | 'react-native'
  | 'ink'
  | 'node'

export type Provider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter'
  | 'ollama'
  | 'grok'
  | 'groq'
  | 'mistral'
  | 'together'
  | 'cohere'
  | 'deepseek'
  | 'fireworks'
  | 'huggingface'
  | 'kimi'
  | 'llamacpp'
  | 'lmstudio'
  | 'vllm'
  | 'langchain'
  | 'vercel-ai'
export type Memory =
  | 'in-memory'
  | 'file'
  | 'sqlite'
  | 'redis'
  | 'encrypted'
  | 'graph'
  | 'hierarchical'
  | 'personalization'
  | 'file-vector'
  | 'redis-vector'
export type PackageManager = 'pnpm' | 'npm' | 'bun'

export const FRAMEWORKS: { value: Framework; label: string; pkg: string; hook: string }[] = [
  { value: 'react', label: 'React', pkg: '@agentskit/react', hook: 'useChat' },
  { value: 'vue', label: 'Vue', pkg: '@agentskit/vue', hook: 'useChat' },
  { value: 'svelte', label: 'Svelte', pkg: '@agentskit/svelte', hook: 'createChatStore' },
  { value: 'solid', label: 'Solid', pkg: '@agentskit/solid', hook: 'useChat' },
  { value: 'angular', label: 'Angular', pkg: '@agentskit/angular', hook: 'ChatState' },
  { value: 'react-native', label: 'React Native', pkg: '@agentskit/react-native', hook: 'useChat' },
  { value: 'ink', label: 'Ink (terminal)', pkg: '@agentskit/ink', hook: 'useChat' },
  { value: 'node', label: 'Node (no UI)', pkg: '@agentskit/runtime', hook: 'runtime.run' },
]

export const PROVIDERS: {
  value: Provider
  label: string
  pkg: string
  factory: string
  model: string
}[] = [
  { value: 'openai', label: 'OpenAI', pkg: '@agentskit/adapters/openai', factory: 'openai', model: 'gpt-4o-mini' },
  { value: 'anthropic', label: 'Anthropic', pkg: '@agentskit/adapters/anthropic', factory: 'anthropic', model: 'claude-sonnet-4-6' },
  { value: 'gemini', label: 'Gemini', pkg: '@agentskit/adapters/gemini', factory: 'gemini', model: 'gemini-2.5-flash' },
  { value: 'openrouter', label: 'OpenRouter', pkg: '@agentskit/adapters/openrouter', factory: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' },
  { value: 'ollama', label: 'Ollama', pkg: '@agentskit/adapters/ollama', factory: 'ollama', model: 'llama3.1' },
  { value: 'grok', label: 'Grok (xAI)', pkg: '@agentskit/adapters/grok', factory: 'grok', model: 'grok-2-latest' },
  { value: 'groq', label: 'Groq', pkg: '@agentskit/adapters/groq', factory: 'groq', model: 'openai/gpt-oss-120b' },
  { value: 'mistral', label: 'Mistral', pkg: '@agentskit/adapters/mistral', factory: 'mistral', model: 'mistral-large-latest' },
  { value: 'together', label: 'Together', pkg: '@agentskit/adapters/together', factory: 'together', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { value: 'cohere', label: 'Cohere', pkg: '@agentskit/adapters/cohere', factory: 'cohere', model: 'command-r-plus' },
  { value: 'deepseek', label: 'DeepSeek', pkg: '@agentskit/adapters/deepseek', factory: 'deepseek', model: 'deepseek-chat' },
  { value: 'fireworks', label: 'Fireworks', pkg: '@agentskit/adapters/fireworks', factory: 'fireworks', model: 'accounts/fireworks/models/llama-v3p3-70b-instruct' },
  { value: 'huggingface', label: 'Hugging Face', pkg: '@agentskit/adapters/huggingface', factory: 'huggingface', model: 'meta-llama/Llama-3.3-70B-Instruct' },
  { value: 'kimi', label: 'Kimi (Moonshot)', pkg: '@agentskit/adapters/kimi', factory: 'kimi', model: 'moonshot-v1-8k' },
  { value: 'llamacpp', label: 'llama.cpp', pkg: '@agentskit/adapters/llamacpp', factory: 'llamacpp', model: 'local' },
  { value: 'lmstudio', label: 'LM Studio', pkg: '@agentskit/adapters/lmstudio', factory: 'lmstudio', model: 'local' },
  { value: 'vllm', label: 'vLLM', pkg: '@agentskit/adapters/vllm', factory: 'vllm', model: 'local' },
  { value: 'langchain', label: 'LangChain', pkg: '@agentskit/adapters/langchain', factory: 'langchain', model: '—' },
  { value: 'vercel-ai', label: 'Vercel AI SDK', pkg: '@agentskit/adapters/vercel-ai', factory: 'vercelAI', model: '—' },
]

export const MEMORIES: {
  value: Memory
  label: string
  pkg: string
  factory: string
  args: string
}[] = [
  { value: 'in-memory', label: 'In-memory (dev)', pkg: '@agentskit/memory', factory: 'inMemory', args: '()' },
  { value: 'file', label: 'File (JSON)', pkg: '@agentskit/memory/file', factory: 'fileMemory', args: `({ path: './threads.json' })` },
  { value: 'sqlite', label: 'SQLite', pkg: '@agentskit/memory/sqlite', factory: 'sqliteMemory', args: `({ path: './threads.db' })` },
  { value: 'redis', label: 'Redis', pkg: '@agentskit/memory/redis', factory: 'redisMemory', args: `({ url: process.env.REDIS_URL! })` },
  { value: 'encrypted', label: 'Encrypted', pkg: '@agentskit/memory/encrypted', factory: 'encryptedMemory', args: `({ key: process.env.MEMORY_KEY! })` },
  { value: 'graph', label: 'Graph', pkg: '@agentskit/memory/graph', factory: 'graphMemory', args: '()' },
  { value: 'hierarchical', label: 'Hierarchical', pkg: '@agentskit/memory/hierarchical', factory: 'hierarchicalMemory', args: '()' },
  { value: 'personalization', label: 'Personalization', pkg: '@agentskit/memory/personalization', factory: 'personalizationMemory', args: '()' },
  { value: 'file-vector', label: 'File vector', pkg: '@agentskit/memory/vector/file', factory: 'fileVectorMemory', args: `({ path: './vectors.json' })` },
  { value: 'redis-vector', label: 'Redis vector', pkg: '@agentskit/memory/vector/redis', factory: 'redisVectorMemory', args: `({ url: process.env.REDIS_URL! })` },
]

export const PACKAGE_MANAGERS: { value: PackageManager; label: string; add: string; run: string }[] = [
  { value: 'pnpm', label: 'pnpm', add: 'pnpm add', run: 'pnpm' },
  { value: 'npm', label: 'npm', add: 'npm install', run: 'npx' },
  { value: 'bun', label: 'bun', add: 'bun add', run: 'bunx' },
]

type Key<T extends string> = {
  key: string
  event: string
  isValid: (v: string) => v is T
  fallback: T
}

const FRAMEWORK: Key<Framework> = {
  key: 'ak:framework',
  event: 'ak:framework-change',
  isValid: (v): v is Framework => FRAMEWORKS.some((f) => f.value === v),
  fallback: 'react',
}
const PROVIDER: Key<Provider> = {
  key: 'ak:provider',
  event: 'ak:provider-change',
  isValid: (v): v is Provider => PROVIDERS.some((f) => f.value === v),
  fallback: 'openai',
}
const MEMORY: Key<Memory> = {
  key: 'ak:memory',
  event: 'ak:memory-change',
  isValid: (v): v is Memory => MEMORIES.some((f) => f.value === v),
  fallback: 'in-memory',
}
const PACKAGE_MANAGER: Key<PackageManager> = {
  key: 'ak:package-manager',
  event: 'ak:package-manager-change',
  isValid: (v): v is PackageManager => PACKAGE_MANAGERS.some((f) => f.value === v),
  fallback: 'pnpm',
}

function subscribe(event: string) {
  return (cb: () => void) => {
    if (typeof window === 'undefined') return () => {}
    const handler = () => cb()
    window.addEventListener(event, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(event, handler)
      window.removeEventListener('storage', handler)
    }
  }
}

function read<T extends string>(k: Key<T>): T {
  if (typeof window === 'undefined') return k.fallback
  try {
    const raw = window.localStorage.getItem(k.key)
    return raw && k.isValid(raw) ? raw : k.fallback
  } catch {
    return k.fallback
  }
}

function write<T extends string>(k: Key<T>, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(k.key, value)
  window.dispatchEvent(new CustomEvent(k.event))
}

function useKey<T extends string>(k: Key<T>): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe(k.event),
    () => read(k),
    () => k.fallback,
  )
  return [value, (v: T) => write(k, v)]
}

export const useFramework = () => useKey(FRAMEWORK)
export const useProvider = () => useKey(PROVIDER)
export const useMemory = () => useKey(MEMORY)
export const usePackageManager = () => useKey(PACKAGE_MANAGER)
