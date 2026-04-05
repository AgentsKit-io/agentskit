import type {
  AdapterFactory,
  ChatMemory,
  Message,
  Observer,
  SkillDefinition,
  ToolCall,
  ToolDefinition,
} from '@agentskit/core'

export interface RuntimeConfig {
  adapter: AdapterFactory
  tools?: ToolDefinition[]
  systemPrompt?: string
  memory?: ChatMemory
  observers?: Observer[]
  maxSteps?: number
  temperature?: number
  maxTokens?: number
}

export interface RunOptions {
  tools?: ToolDefinition[]
  systemPrompt?: string
  skill?: SkillDefinition
  maxSteps?: number
  signal?: AbortSignal
}

export interface RunResult {
  content: string
  messages: Message[]
  steps: number
  toolCalls: ToolCall[]
  durationMs: number
}
