import type { ToolDefinition, SkillDefinition, AdapterFactory } from '@agentskit/core'
import { validateToolTemplate, validateSkillTemplate, validateAdapterTemplate } from './validate'

export interface ToolTemplateConfig {
  base?: ToolDefinition
  name: string
  description?: string
  schema?: ToolDefinition['schema']
  execute?: ToolDefinition['execute']
  tags?: string[]
  category?: string
  requiresConfirmation?: boolean
  init?: () => Promise<void>
  dispose?: () => Promise<void>
}

export function createToolTemplate(config: ToolTemplateConfig): ToolDefinition {
  const tool: ToolDefinition = {
    ...(config.base ?? {}),
    name: config.name,
    ...(config.description !== undefined ? { description: config.description } : {}),
    ...(config.schema !== undefined ? { schema: config.schema } : {}),
    ...(config.execute !== undefined ? { execute: config.execute } : {}),
    ...(config.tags !== undefined ? { tags: config.tags } : {}),
    ...(config.category !== undefined ? { category: config.category } : {}),
    ...(config.requiresConfirmation !== undefined ? { requiresConfirmation: config.requiresConfirmation } : {}),
    ...(config.init !== undefined ? { init: config.init } : {}),
    ...(config.dispose !== undefined ? { dispose: config.dispose } : {}),
  }

  validateToolTemplate(tool)
  return tool
}

export interface SkillTemplateConfig {
  base?: SkillDefinition
  name: string
  description?: string
  systemPrompt?: string
  examples?: SkillDefinition['examples']
  tools?: string[]
  delegates?: string[]
  temperature?: number
  onActivate?: SkillDefinition['onActivate']
}

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
    ...(config.onActivate !== undefined ? { onActivate: config.onActivate } : {}),
  }

  validateSkillTemplate(skill)
  return skill
}

export interface AdapterTemplateConfig {
  name: string
  createSource: AdapterFactory['createSource']
}

export function createAdapterTemplate(config: AdapterTemplateConfig): AdapterFactory & { name: string } {
  const adapter = {
    name: config.name,
    createSource: config.createSource,
  }

  validateAdapterTemplate(adapter)
  return adapter
}
