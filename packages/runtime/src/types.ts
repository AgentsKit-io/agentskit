import type {
  AdapterFactory,
  ChatMemory,
  Message,
  Observer,
  Retriever,
  SkillDefinition,
  ToolCall,
  ToolDefinition,
} from '@agentskit/core'
import type { SharedContext } from './shared-context'

export interface DelegateConfig {
  skill: SkillDefinition
  tools?: ToolDefinition[]
  adapter?: AdapterFactory
  maxSteps?: number
}

export interface RuntimeConfig {
  adapter: AdapterFactory
  tools?: ToolDefinition[]
  systemPrompt?: string
  memory?: ChatMemory
  retriever?: Retriever
  observers?: Observer[]
  maxSteps?: number
  temperature?: number
  maxTokens?: number
  delegates?: Record<string, DelegateConfig>
  maxDelegationDepth?: number
}

export interface RunOptions {
  tools?: ToolDefinition[]
  systemPrompt?: string
  skill?: SkillDefinition
  maxSteps?: number
  signal?: AbortSignal
  delegates?: Record<string, DelegateConfig>
  sharedContext?: SharedContext
}

export interface RunResult {
  content: string
  messages: Message[]
  steps: number
  toolCalls: ToolCall[]
  durationMs: number
}
