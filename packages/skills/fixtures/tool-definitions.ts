import type { ToolDefinition } from '@agentskit/core'

/** Minimal real ToolDefinition fixture for composeSkills onActivate tests. */
export function makeTool(name: string, description = `${name} tool`): ToolDefinition {
  return {
    name,
    description,
    schema: { type: 'object', properties: {} },
    execute: async () => ({ ok: true, name }),
  }
}
