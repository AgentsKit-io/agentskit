import type {
  ToolDefinition,
  SkillDefinition,
  AdapterFactory,
  AdapterCapabilities,
} from '@agentskit/core'
import { validateToolTemplate, validateSkillTemplate, validateAdapterTemplate } from './validate'

/** Options merged into a tool definition before validation. */
export interface ToolTemplateConfig {
  base?: ToolDefinition
  name: string
  description?: string
  schema?: ToolDefinition['schema']
  execute?: ToolDefinition['execute']
  tags?: string[]
  category?: string
  requiresConfirmation?: boolean
  init?: ToolDefinition['init']
  dispose?: ToolDefinition['dispose']
}

/** Create and validate a tool definition from configuration.
 * @param config The tool name, implementation, and optional fields.
 * @returns A validated tool definition.
 * @throws `ConfigError` when the resulting tool is invalid.
 * @example
 * ```ts
 * const searchTool = createToolTemplate({
 *   name: 'search',
 *   description: 'Search the catalog.',
 *   schema: { type: 'object' },
 *   execute: async () => 'results',
 * })
 * ```
 */
export function createToolTemplate(config: ToolTemplateConfig): ToolDefinition {
  const tool: ToolDefinition = {
    ...(config.base ?? {}),
    name: config.name,
    ...(config.description !== undefined ? { description: config.description } : {}),
    ...(config.schema !== undefined ? { schema: config.schema } : {}),
    ...(config.execute !== undefined ? { execute: config.execute } : {}),
    ...(config.tags !== undefined ? { tags: config.tags } : {}),
    ...(config.category !== undefined ? { category: config.category } : {}),
    ...(config.requiresConfirmation !== undefined
      ? { requiresConfirmation: config.requiresConfirmation }
      : {}),
    ...(config.init !== undefined ? { init: config.init } : {}),
    ...(config.dispose !== undefined ? { dispose: config.dispose } : {}),
  }

  validateToolTemplate(tool)
  return tool
}

/** Options merged into a skill definition before validation. */
export interface SkillTemplateConfig {
  base?: SkillDefinition
  name: string
  description?: string
  systemPrompt?: string
  examples?: SkillDefinition['examples']
  tools?: string[]
  delegates?: string[]
  temperature?: number
  /** Opaque skill metadata — passed through to `SkillDefinition.metadata`. */
  metadata?: Record<string, unknown>
  onActivate?: SkillDefinition['onActivate']
}

/** Create and validate a skill definition from configuration.
 * @param config The skill name, prompt, and optional fields.
 * @returns A validated skill definition.
 * @throws `ConfigError` when the resulting skill is invalid.
 * @example
 * ```ts
 * const writingSkill = createSkillTemplate({
 *   name: 'writer',
 *   description: 'Writes concise summaries.',
 *   systemPrompt: 'Summarize the supplied material.',
 * })
 * ```
 */
export function createSkillTemplate(config: SkillTemplateConfig): SkillDefinition {
  const skill: SkillDefinition = {
    ...(config.base ?? { name: '', description: '', systemPrompt: '' }),
    name: config.name,
    ...(config.description !== undefined ? { description: config.description } : {}),
    ...(config.systemPrompt !== undefined ? { systemPrompt: config.systemPrompt } : {}),
    ...(config.examples !== undefined ? { examples: config.examples } : {}),
    ...(config.tools !== undefined ? { tools: config.tools } : {}),
    ...(config.delegates !== undefined ? { delegates: config.delegates } : {}),
    ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
    ...(config.metadata !== undefined ? { metadata: config.metadata } : {}),
    ...(config.onActivate !== undefined ? { onActivate: config.onActivate } : {}),
  }

  validateSkillTemplate(skill)
  return skill
}

/** Options for constructing a named adapter factory. */
export interface AdapterTemplateConfig {
  name: string
  createSource: AdapterFactory['createSource']
  /** Optional capabilities hint — passed through to the factory. */
  capabilities?: AdapterCapabilities
}

/** Create and validate a named adapter factory.
 * @param config The adapter name, source factory, and optional capabilities.
 * @returns A validated adapter factory with its name.
 * @throws `ConfigError` when the resulting adapter is invalid.
 * @example
 * ```ts
 * const adapter = createAdapterTemplate({
 *   name: 'my-adapter',
 *   createSource: () => ({
 *     stream: async function* () { yield { type: 'done' as const } },
 *     abort: () => {},
 *   }),
 * })
 * ```
 */
export function createAdapterTemplate(
  config: AdapterTemplateConfig,
): AdapterFactory & { name: string } {
  const adapter: AdapterFactory & { name: string } = {
    name: config.name,
    createSource: config.createSource,
    ...(config.capabilities !== undefined ? { capabilities: config.capabilities } : {}),
  }

  validateAdapterTemplate(adapter)
  return adapter
}
