import type { ToolDefinition } from '@agentskit/core'
import type { DelegateConfig, RunResult } from './types'

export function buildDelegateTools(
  delegates: Record<string, DelegateConfig>,
  runDelegate: (name: string, config: DelegateConfig, task: string) => Promise<RunResult>,
): ToolDefinition[] {
  return Object.entries(delegates).map(([name, config]) => ({
    name: `delegate_${name}`,
    description: `Delegate a subtask to the "${name}" agent. ${config.skill.description}`,
    schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: `The task to delegate to ${name}` },
      },
      required: ['task'],
    },
    execute: async (args: Record<string, unknown>) => {
      const result = await runDelegate(name, config, args.task as string)
      return result.content
    },
  }))
}
