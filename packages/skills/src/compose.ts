import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { SkillDefinition, ToolDefinition } from '@agentskit/core'
import {
  cloneJsonValue,
  cloneSkillDefinition,
  composeSkillName,
  dedupeNamesLastWins,
  validateSkillDefinition,
} from './utils'

export function composeSkills(...skills: SkillDefinition[]): SkillDefinition {
  if (skills.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'composeSkills requires at least one skill',
    })
  }

  for (const skill of skills) validateSkillDefinition(skill)
  if (skills.length === 1) return cloneSkillDefinition(skills[0]!)

  const names = skills.map(s => s.name)
  const tools = dedupeNamesLastWins(skills.flatMap(s => s.tools ?? []))
  const delegates = dedupeNamesLastWins(skills.flatMap(s => s.delegates ?? []))
  const examples = skills.flatMap(s => (s.examples ?? []).map(ex => cloneJsonValue(ex, 'example')))

  let temperature: number | undefined
  let metadata: Record<string, unknown> | undefined
  for (const s of skills) {
    if (s.temperature !== undefined) temperature = s.temperature
    if (s.metadata !== undefined) {
      metadata = { ...(metadata ?? {}), ...cloneJsonValue(s.metadata, 'metadata') }
    }
  }

  const hooks = skills.filter(s => s.onActivate).map(s => s.onActivate!)

  return {
    name: composeSkillName(names),
    description: `Composed skill: ${names.join(', ')}`,
    systemPrompt: skills.map(s => `--- ${s.name} ---\n${s.systemPrompt}`).join('\n\n'),
    tools: tools.length > 0 ? tools : undefined,
    delegates: delegates.length > 0 ? delegates : undefined,
    examples: examples.length > 0 ? examples : undefined,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
    onActivate:
      hooks.length > 0
        ? async () => {
            const results = await Promise.all(hooks.map(h => h()))
            const map = new Map<string, ToolDefinition>()
            for (const r of results) {
              for (const tool of r.tools ?? []) map.set(tool.name, tool)
            }
            const allTools = [...map.values()]
            return { tools: allTools.length > 0 ? allTools : undefined }
          }
        : undefined,
  }
}
