import type { SkillDefinition, ToolDefinition } from '@agentskit/core'
import type { SlashCommand } from '../../slash-commands'

/**
 * Public plugin contract. Every capability shipped by the CLI is a record
 * that a plugin can contribute or override — built-ins use the same shape.
 */
export interface Plugin {
  name: string
  version?: string

  slashCommands?: SlashCommand[]
  tools?: ToolDefinition[]
  skills?: SkillDefinition[]
  providers?: Record<string, ProviderFactory>
  hooks?: HookHandler[]
  mcpServers?: McpServerSpec[]

  init?: (ctx: PluginContext) => void | Promise<void>
  dispose?: () => void | Promise<void>
}

export interface PluginContext {
  /** Working directory the CLI was launched from. */
  cwd: string
  /** Absolute path to the plugin file (for relative resolution). */
  sourcePath?: string
  /** Logger. */
  log: (msg: string) => void
}

export type ProviderFactory = (config: {
  apiKey?: string
  model: string
  baseUrl?: string
  extra?: Record<string, unknown>
}) => unknown

export type HookEvent =
  | 'SessionStart'
  | 'SessionEnd'
  | 'UserPromptSubmit'
  | 'PreLLM'
  | 'PostLLM'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Stop'
  | 'Error'

export interface HookPayload {
  event: HookEvent
  [key: string]: unknown
}

export type HookResult =
  | { decision: 'continue' }
  | { decision: 'block'; reason: string }
  | { decision: 'modify'; payload: HookPayload }

export interface HookHandler {
  event: HookEvent
  matcher?: RegExp | ((payload: HookPayload) => boolean)
  run: (payload: HookPayload) => HookResult | Promise<HookResult>
}

export interface McpServerSpec {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  timeout?: number
}

/** Plugin factory — a plugin module may export this instead of a Plugin value. */
export type PluginFactory = (ctx: PluginContext) => Plugin | Promise<Plugin>

/** Shape of aggregated plugin records after loading. */
export interface PluginBundle {
  plugins: Plugin[]
  slashCommands: SlashCommand[]
  tools: ToolDefinition[]
  skills: SkillDefinition[]
  providers: Record<string, ProviderFactory>
  hooks: HookHandler[]
  mcpServers: McpServerSpec[]
}
