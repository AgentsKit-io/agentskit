import type { AdapterFactory, SkillDefinition, ToolDefinition } from '@agentskit/core'
import { createRuntime } from '@agentskit/runtime'

export interface AgentToolConfig {
  /** Tool name exposed to the MCP host (the agent id). */
  id: string
  description: string
  /** The agent's system prompt (its skill). */
  systemPrompt: string
  /** Model adapter the agent runs on (server-side). */
  adapter: AdapterFactory
  maxSteps?: number
}

/**
 * Wrap a whole agent as a single MCP tool. The MCP host calls it with a `task`
 * string; the agent runs server-side (its own skill + reasoning loop on the
 * provided adapter) and returns the result. This is "agents as MCP tools" — the
 * host delegates a specialized job rather than orchestrating primitives.
 */
export function createAgentTool(config: AgentToolConfig): ToolDefinition {
  const skill: SkillDefinition = {
    name: config.id,
    description: config.description,
    systemPrompt: config.systemPrompt,
  }
  return {
    name: config.id,
    description: config.description,
    schema: {
      type: 'object',
      properties: { task: { type: 'string', description: 'The task or input for the agent.' } },
      required: ['task'],
    },
    execute: async (args: Record<string, unknown>) => {
      const runtime = createRuntime({ adapter: config.adapter, maxSteps: config.maxSteps ?? 8 })
      const result = await runtime.run(String(args.task ?? ''), { skill })
      return { content: result.content, steps: result.steps }
    },
  }
}
