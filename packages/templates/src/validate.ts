import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { ToolDefinition, SkillDefinition, AdapterFactory } from '@agentskit/core'

const invalid = (message: string): ConfigError =>
  new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message })

export function validateToolTemplate(tool: Partial<ToolDefinition>): asserts tool is ToolDefinition {
  if (!tool.name) throw invalid('Tool requires a name')
  if (!tool.description) throw invalid(`Tool "${tool.name}" requires a description — LLMs need it to decide when to use the tool`)
  if (!tool.schema) throw invalid(`Tool "${tool.name}" requires a schema — LLMs need JSON Schema for function calling`)
  if (!tool.execute) throw invalid(`Tool "${tool.name}" requires an execute function`)
}

export function validateSkillTemplate(skill: Partial<SkillDefinition>): asserts skill is SkillDefinition {
  if (!skill.name) throw invalid('Skill requires a name')
  if (!skill.description) throw invalid(`Skill "${skill.name}" requires a description`)
  if (!skill.systemPrompt) throw invalid(`Skill "${skill.name}" requires a systemPrompt — this is the core behavior definition`)
}

export function validateAdapterTemplate(adapter: unknown): asserts adapter is AdapterFactory {
  const a = adapter as Record<string, unknown>
  if (!a || typeof a !== 'object') throw invalid('Adapter must be an object')
  if (typeof a.createSource !== 'function') throw invalid('Adapter requires a createSource function')
}
