import type { MaybePromise } from './common'
import type { ToolDefinition } from './tool'

/** Prompt, metadata, and optional activation hook contributed by a skill. */
export interface SkillDefinition {
  name: string
  description: string
  systemPrompt: string
  examples?: Array<{ input: string; output: string }>
  tools?: string[]
  delegates?: string[]
  temperature?: number
  metadata?: Record<string, unknown>
  onActivate?: () => MaybePromise<{ tools?: ToolDefinition[] }>
}
