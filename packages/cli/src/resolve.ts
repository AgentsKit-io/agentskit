import type { ChatMemory, SkillDefinition, ToolDefinition } from '@agentskit/core'
import { webSearch, fetchUrl, filesystem, shell } from '@agentskit/tools'
import { researcher, coder, planner, critic, summarizer, composeSkills } from '@agentskit/skills'
import { fileChatMemory, sqliteChatMemory } from '@agentskit/memory'

export const skillRegistry: Record<string, SkillDefinition> = {
  researcher,
  coder,
  planner,
  critic,
  summarizer,
}

type ToolKind = 'web_search' | 'fetch_url' | 'filesystem' | 'shell'

const BUILTIN_NAMES: Record<ToolKind, readonly string[]> = {
  web_search: ['web_search'],
  fetch_url: ['fetch_url'],
  filesystem: ['fs_read', 'fs_write', 'fs_list'],
  shell: ['shell'],
}

function instantiate(kind: ToolKind): ToolDefinition[] {
  switch (kind) {
    case 'web_search':
      return [webSearch()]
    case 'fetch_url':
      return [fetchUrl()]
    case 'filesystem':
      return filesystem({ basePath: process.cwd() })
    case 'shell':
      // CLI gates shell behind requiresConfirmation; explicit allowAny
      // surfaces the dual-use nature without forcing every CLI user to
      // pick an allowlist up front.
      return [shell({ timeout: 30_000, allowAny: true })]
  }
}

function gateTool(tool: ToolDefinition): ToolDefinition {
  // Preserve an explicit `false` from the tool author, otherwise force on.
  if (tool.requiresConfirmation === false) return tool
  return { ...tool, requiresConfirmation: true }
}

/**
 * Resolves the tool set for `agentskit chat`.
 *
 * - Explicit `--tools web_search,fetch_url`: those tools run without
 *   confirmation (user opted in).
 * - No `--tools` flag: `web_search` and `fetch_url` are registered but
 *   wrapped with `requiresConfirmation: true`. The agent can still call
 *   them; the user just approves each call the first time. Mirrors the
 *   Claude Code "permission on first use" pattern.
 */
export function resolveTools(toolNames: string | undefined): ToolDefinition[] {
  if (!toolNames) {
    return [...instantiate('web_search'), ...instantiate('fetch_url')].map(gateTool)
  }

  const tools: ToolDefinition[] = []
  for (const name of toolNames.split(',').map(s => s.trim()).filter(Boolean)) {
    switch (name) {
      case 'web_search':
      case 'fetch_url':
      case 'filesystem':
      case 'shell':
        tools.push(...instantiate(name))
        break
      default:
        process.stderr.write(`Unknown tool: ${name}\n`)
    }
  }
  return tools
}

/** Exposed for UI layers that want to render "N tools auto-allowed" hints. */
export function getBuiltinToolNames(kind: ToolKind): readonly string[] {
  return BUILTIN_NAMES[kind]
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
      return fileChatMemory(memoryPath)
  }
}
