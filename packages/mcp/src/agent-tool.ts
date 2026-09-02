import {
  ConfigError,
  ErrorCodes,
  ToolError,
  type AdapterFactory,
  type SkillDefinition,
  type ToolCall,
  type ToolDefinition,
} from '@agentskit/core'
import { createRuntime, invokeStructured } from '@agentskit/runtime'
import { createAjvValidator } from '@agentskit/tools/validation'
import { assertNonEmptyString, assertPositiveInteger, assertToolName, isRecord } from './validation'

type JsonSchema = NonNullable<ToolDefinition['schema']>

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

export interface TypedAgentToolConfig extends AgentToolConfig {
  inputSchema: JsonSchema
  outputSchema: JsonSchema
  resultToolName: string
  onConfirm?: (toolCall: ToolCall) => boolean | Promise<boolean>
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

/**
 * Expose a Registry agent without discarding its structured output contract.
 * The result tool stays internal to the runtime; only the typed outer tool is
 * visible to the MCP host.
 */
export function createTypedAgentTool(config: TypedAgentToolConfig): ToolDefinition {
  const id = assertToolName(config?.id, 'typed agent tool id')
  const description = assertNonEmptyString(config?.description, 'typed agent tool description', 4096)
  const systemPrompt = assertNonEmptyString(config?.systemPrompt, 'typed agent tool systemPrompt', 65_536)
  const resultToolName = assertToolName(config?.resultToolName, 'typed agent result tool name')
  const maxSteps = assertPositiveInteger(config.maxSteps ?? 4, 'typed agent maxSteps', 100)
  const maxTaskBytes = assertPositiveInteger(config.maxTaskBytes ?? 65_536, 'typed agent input', 1_048_576)
  if (!isRecord(config?.adapter) || typeof config.adapter.createSource !== 'function') {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'typed agent tool adapter must implement createSource',
    })
  }
  if (!isRecord(config.inputSchema) || !isRecord(config.outputSchema)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'typed agent tool schemas must be JSON Schema objects',
    })
  }

  const validate = createAjvValidator({ rejectAdditionalProperties: true })
  try {
    validate(config.inputSchema, {})
    validate(config.outputSchema, {})
  } catch {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'typed agent tool schemas must be valid JSON Schema',
    })
  }

  const submit: ToolDefinition = {
    name: resultToolName,
    description: 'Return the structured agent result.',
    schema: config.outputSchema,
    execute: async () => 'recorded',
  }
  const skill: SkillDefinition = { name: id, description, systemPrompt }
  const tool: ToolDefinition = {
    name: id,
    description,
    schema: config.inputSchema,
    execute: async (args: Record<string, unknown>) => {
      const task = JSON.stringify(args)
      if (new TextEncoder().encode(task).byteLength > maxTaskBytes) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: `typed agent input must not exceed ${maxTaskBytes} bytes`,
        })
      }
      const input = validate(config.inputSchema, args)
      if (!input.valid) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: input.message ?? 'typed agent input does not match its schema',
        })
      }
      return invokeStructured({
        adapter: config.adapter,
        tool: submit,
        task: `INPUT:\n${task}`,
        parse: (value) => {
          const output = validate(config.outputSchema, value)
          if (!output.valid) {
            throw new ToolError({
              code: ErrorCodes.AK_TOOL_INVALID_INPUT,
              message: output.message ?? 'typed agent output does not match its schema',
            })
          }
          return value
        },
        skill,
        onConfirm: config.onConfirm,
        maxSteps,
      })
    },
  }
  return Object.freeze(tool)
}
