import { ConfigError, ErrorCodes, defineTool } from '@agentskit/core'
import type { ToolDefinition } from '@agentskit/core'
import type { RuntimeInspector } from './inspector'

/**
 * Devtools tools exposed over MCP. Hand the array to `createMcpServer`
 * (from `@agentskit/tools/mcp`) and any MCP-aware client (Claude Code,
 * Cursor, Codex) can drive a running AgentsKit runtime.
 *
 * Methods are gated by the inspector capability surface — only tools
 * whose inspector method exists are registered. Read-only consumers
 * pass an inspector with just `listSessions` / `inspectSession` and
 * never expose pause / step / replay.
 *
 * Auth is intentionally NOT a per-tool argument. The MCP server's
 * transport is the right place to enforce auth (bearer header on
 * HTTP/WebSocket, file-permissions on stdio). Wrap your transport
 * with the credential check before passing it to `createMcpServer`.
 */

export interface DevtoolsToolsOptions {
  inspector: RuntimeInspector
}

export function devtoolsTools(options: DevtoolsToolsOptions): ToolDefinition[] {
  if (!options.inspector) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'devtoolsTools: inspector is required',
      hint: 'Pass a RuntimeInspector adapter wrapping your runtime.',
    })
  }
  const { inspector } = options
  const tools = []

  if (inspector.listSessions) {
    tools.push(
      defineTool({
        name: 'devtools_list_sessions',
        description: 'List active and recent agent sessions known to the runtime.',
        schema: { type: 'object', properties: {} } as const,
        async execute() {
          return { sessions: await inspector.listSessions!() }
        },
      }),
    )
  }

  if (inspector.inspectSession) {
    tools.push(
      defineTool({
        name: 'devtools_inspect_session',
        description: 'Fetch full detail for a single session — messages, tokens, cost, errors.',
        schema: {
          type: 'object',
          properties: { session_id: { type: 'string' } },
          required: ['session_id'],
        } as const,
        async execute({ session_id }) {
          return await inspector.inspectSession!(String(session_id))
        },
      }),
    )
  }

  if (inspector.listTools) {
    tools.push(
      defineTool({
        name: 'devtools_list_tools',
        description: 'List tools registered with the runtime, including which require confirmation.',
        schema: { type: 'object', properties: {} } as const,
        async execute() {
          return { tools: await inspector.listTools!() }
        },
      }),
    )
  }

  if (inspector.listSkills) {
    tools.push(
      defineTool({
        name: 'devtools_list_skills',
        description: 'List skills registered with the runtime.',
        schema: { type: 'object', properties: {} } as const,
        async execute() {
          return { skills: await inspector.listSkills!() }
        },
      }),
    )
  }

  if (inspector.listMemories) {
    tools.push(
      defineTool({
        name: 'devtools_list_memories',
        description: 'List memory backends configured on the runtime, optionally scoped to a tenant or namespace.',
        schema: {
          type: 'object',
          properties: { scope: { type: 'string' } },
        } as const,
        async execute({ scope }) {
          const s = typeof scope === 'string' ? scope : undefined
          return { memories: await inspector.listMemories!(s) }
        },
      }),
    )
  }

  if (inspector.pauseRuntime) {
    tools.push(
      defineTool({
        name: 'devtools_pause_runtime',
        description: 'Pause an active session loop. Destructive — agent stops producing output.',
        schema: {
          type: 'object',
          properties: { session_id: { type: 'string' } },
          required: ['session_id'],
        } as const,
        requiresConfirmation: true,
        async execute({ session_id }) {
          return await inspector.pauseRuntime!(String(session_id))
        },
      }),
    )
  }

  if (inspector.resumeRuntime) {
    tools.push(
      defineTool({
        name: 'devtools_resume_runtime',
        description: 'Resume a paused session loop.',
        schema: {
          type: 'object',
          properties: { session_id: { type: 'string' } },
          required: ['session_id'],
        } as const,
        requiresConfirmation: true,
        async execute({ session_id }) {
          return await inspector.resumeRuntime!(String(session_id))
        },
      }),
    )
  }

  if (inspector.stepRuntime) {
    tools.push(
      defineTool({
        name: 'devtools_step_runtime',
        description: 'Advance a paused session by exactly one step.',
        schema: {
          type: 'object',
          properties: { session_id: { type: 'string' } },
          required: ['session_id'],
        } as const,
        async execute({ session_id }) {
          return await inspector.stepRuntime!(String(session_id))
        },
      }),
    )
  }

  if (inspector.replaySession) {
    tools.push(
      defineTool({
        name: 'devtools_replay_session',
        description: 'Replay a session deterministically from the recorded history, optionally starting at a specific step.',
        schema: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            from_step: { type: 'number', description: 'Step index to replay from. Default 0.' },
          },
          required: ['session_id'],
        } as const,
        async execute({ session_id, from_step }) {
          const step = typeof from_step === 'number' ? from_step : undefined
          return await inspector.replaySession!(String(session_id), step)
        },
      }),
    )
  }

  if (inspector.listEvals) {
    tools.push(
      defineTool({
        name: 'devtools_list_evals',
        description: 'List evaluation suites the runtime can execute.',
        schema: { type: 'object', properties: {} } as const,
        async execute() {
          return { evals: await inspector.listEvals!() }
        },
      }),
    )
  }

  if (inspector.runEval) {
    tools.push(
      defineTool({
        name: 'devtools_run_eval',
        description: 'Run a named evaluation suite and return its summary (pass / fail / duration).',
        schema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        } as const,
        async execute({ name }) {
          return await inspector.runEval!(String(name))
        },
      }),
    )
  }

  if (tools.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'devtoolsTools: inspector exposed no inspection methods — at least one is required',
      hint: 'Implement at least listSessions on your RuntimeInspector adapter.',
    })
  }

  return tools as ToolDefinition[]
}
