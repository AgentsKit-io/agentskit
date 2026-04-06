import type { ToolDefinition, SkillDefinition, AdapterFactory } from '@agentskit/core'

export function validateToolTemplate(tool: Partial<ToolDefinition>): asserts tool is ToolDefinition {
  if (!tool.name) throw new Error('Tool requires a name')
  if (!tool.description) throw new Error(`Tool "${tool.name}" requires a description — LLMs need it to decide when to use the tool`)
  if (!tool.schema) throw new Error(`Tool "${tool.name}" requires a schema — LLMs need JSON Schema for function calling`)
  if (!tool.execute) throw new Error(`Tool "${tool.name}" requires an execute function`)
}

export function validateSkillTemplate(skill: Partial<SkillDefinition>): asserts skill is SkillDefinition {
  if (!skill.name) throw new Error('Skill requires a name')
  if (!skill.description) throw new Error(`Skill "${skill.name}" requires a description`)
  if (!skill.systemPrompt) throw new Error(`Skill "${skill.name}" requires a systemPrompt — this is the core behavior definition`)
}

export function validateAdapterTemplate(adapter: unknown): asserts adapter is AdapterFactory {
  const a = adapter as Record<string, unknown>
  if (!a || typeof a !== 'object') throw new Error('Adapter must be an object')
  if (typeof a.createSource !== 'function') throw new Error('Adapter requires a createSource function')
}
