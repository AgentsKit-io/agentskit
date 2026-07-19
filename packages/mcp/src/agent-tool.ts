import {
  ConfigError,
  ErrorCodes,
  ToolError,
  type AdapterFactory,
  type SkillDefinition,
  type ToolDefinition,
} from '@agentskit/core'
import { createRuntime } from '@agentskit/runtime'
import { assertNonEmptyString, assertPositiveInteger, assertToolName, isRecord } from './validation'

export interface AgentToolConfig {
  /** Tool name exposed to the MCP host (the agent id). */
  id: string
  description: string
  /** The agent's system prompt (its skill). */
  systemPrompt: string
  /** Model adapter the agent runs on (server-side). */
  adapter: AdapterFactory
  maxSteps?: number
  /** Maximum UTF-8 bytes accepted in one task. Default 65536. */
  maxTaskBytes?: number
}

/**
 * Wrap a whole agent as a single MCP tool. The MCP host calls it with a `task`
 * string; the agent runs server-side (its own skill + reasoning loop on the
 * provided adapter) and returns the result. This is "agents as MCP tools" — the
 * host delegates a specialized job rather than orchestrating primitives.
 */
export function createAgentTool(config: AgentToolConfig): ToolDefinition {
  const id = assertToolName(config?.id, 'agent tool id')
  const description = assertNonEmptyString(config?.description, 'agent tool description', 4096)
  const systemPrompt = assertNonEmptyString(config?.systemPrompt, 'agent tool systemPrompt', 65_536)
  if (!isRecord(config?.adapter) || typeof config.adapter.createSource !== 'function') {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'agent tool adapter must implement createSource',
    })
  }
  const maxSteps = assertPositiveInteger(config.maxSteps ?? 8, 'agent tool maxSteps', 100)
  const maxTaskBytes = assertPositiveInteger(config.maxTaskBytes ?? 65_536, 'agent tool maxTaskBytes', 1_048_576)
  const skill: SkillDefinition = {
    name: id,
    description,
    systemPrompt,
  }
  const tool: ToolDefinition = {
    name: id,
    description,
    schema: {
      type: 'object',
      properties: { task: { type: 'string', description: 'The task or input for the agent.' } },
      required: ['task'],
      additionalProperties: false,
    },
    execute: async (args: Record<string, unknown>) => {
      if (typeof args.task !== 'string' || args.task.trim().length === 0) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'agent tool task must be a non-empty string',
        })
      }
      if (new TextEncoder().encode(args.task).byteLength > maxTaskBytes) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: `agent tool task must not exceed ${maxTaskBytes} bytes`,
        })
      }
      const runtime = createRuntime({ adapter: config.adapter, maxSteps })
      const result = await runtime.run(args.task, { skill })
      return { content: result.content, steps: result.steps }
    },
  }
  return Object.freeze(tool)
}
