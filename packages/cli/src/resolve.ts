import { createFileMemory } from '@agentskit/core'
import type { ChatMemory, SkillDefinition, ToolDefinition } from '@agentskit/core'
import { webSearch, filesystem, shell } from '@agentskit/tools'
import { researcher, coder, planner, critic, summarizer, composeSkills } from '@agentskit/skills'
import { sqliteChatMemory } from '@agentskit/memory'

export const skillRegistry: Record<string, SkillDefinition> = {
  researcher,
  coder,
  planner,
  critic,
  summarizer,
}

export function resolveTools(toolNames: string | undefined): ToolDefinition[] {
  if (!toolNames) return []
  const tools: ToolDefinition[] = []
  for (const name of toolNames.split(',').map(s => s.trim())) {
    switch (name) {
      case 'web_search':
        tools.push(webSearch())
        break
      case 'filesystem':
        tools.push(...filesystem({ basePath: process.cwd() }))
        break
      case 'shell':
        tools.push(shell({ timeout: 30_000 }))
        break
      default:
        process.stderr.write(`Unknown tool: ${name}\n`)
    }
  }
  return tools
}

export function resolveSkill(skillName: string | undefined): SkillDefinition | undefined {
  if (!skillName) return undefined
  const skill = skillRegistry[skillName.trim()]
  if (!skill) {
    process.stderr.write(`Unknown skill: ${skillName}\n`)
    return undefined
  }
  return skill
}

export function resolveSkills(skillNames: string | undefined): SkillDefinition | undefined {
  if (!skillNames) return undefined
  const names = skillNames.split(',').map(s => s.trim())
  const resolved = names.map(n => skillRegistry[n]).filter(Boolean)
  if (resolved.length === 0) {
    process.stderr.write(`No valid skills found in: ${skillNames}\n`)
    return undefined
  }
  if (resolved.length === 1) return resolved[0]
  return composeSkills(...resolved)
}

export function resolveMemory(backend: string | undefined, memoryPath: string): ChatMemory {
  switch (backend) {
    case 'sqlite':
      return sqliteChatMemory({ path: memoryPath.replace(/\.json$/, '.db') })
    case 'file':
    default:
      return createFileMemory(memoryPath)
  }
}
