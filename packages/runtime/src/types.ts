import type {
  AdapterFactory,
  ArgsValidator,
  ChatMemory,
  MaybePromise,
  Message,
  Observer,
  Retriever,
  SkillDefinition,
  ToolCall,
  ToolDefinition,
} from '@agentskit/core'
import type { SharedContext } from './shared-context'

/**
 * Configuration for a named sub-agent, including its skill and optional tools or adapter.
 */
export interface DelegateConfig {
  skill: SkillDefinition
  tools?: ToolDefinition[]
  adapter?: AdapterFactory
  maxSteps?: number
}

/**
 * Configuration shared by every run of a runtime.
 */
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
  onConfirm?: (toolCall: ToolCall) => MaybePromise<boolean>
  /**
   * Opt-in runtime validator for tool-call arguments (ADR-0008). When set,
   * model-produced args are checked against each tool's JSON Schema before
   * execution; mismatches raise `AK_TOOL_INVALID_INPUT`. Use
   * `createAjvValidator()` from `@agentskit/tools/validation`.
   */
  validateArgs?: ArgsValidator
}

/**
 * Options that override runtime settings for one run.
 */
export interface RunOptions {
  tools?: ToolDefinition[]
  systemPrompt?: string
  skill?: SkillDefinition
  maxSteps?: number
  /** Stable identifier shared by all tool calls in this run. */
  runId?: string
  signal?: AbortSignal
  delegates?: Record<string, DelegateConfig>
  sharedContext?: SharedContext
}

/**
 * The final text, message history, step and tool-call counts, and duration for a run.
 */
export interface RunResult {
  content: string
  messages: Message[]
  steps: number
  toolCalls: ToolCall[]
  durationMs: number
}
