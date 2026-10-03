/**
 * Agent-to-Agent Protocol (A2A) — minimal open spec for one agent to
 * invoke another over JSON-RPC 2.0. Companion to MCP (which is
 * model-to-tool); A2A is agent-to-agent task delegation, approvals,
 * and streaming status updates.
 *
 * Version: 2026-04.
 */

import { isRecord } from './primitives'

export const A2A_PROTOCOL_VERSION = '2026-04'

/** Public identity, version, skills, and optional metadata advertised by an agent. */
export interface A2AAgentCard {
  /** Stable identifier (reverse-DNS or npm scope recommended). */
  id: string
  name: string
  description?: string
  version: string
  /** Skills the agent advertises. */
  skills: A2ASkillDescriptor[]
  /** Optional JSON Schema for expected context on `task/invoke`. */
  contextSchema?: Record<string, unknown>
  /** Human-facing URL (docs, source, demo). */
  homepage?: string
  /** Icon URL for marketplaces. */
  icon?: string
}

/** A skill an agent advertises for remote invocation. */
export interface A2ASkillDescriptor {
  name: string
  description?: string
  /** JSON Schema of the expected task input. */
  inputSchema?: Record<string, unknown>
  /** Advertised capabilities the caller can rely on. */
  capabilities?: {
    streaming?: boolean
    cancellation?: boolean
    requiresApproval?: boolean
  }
}

// ---------------------------------------------------------------------------
// Wire protocol — JSON-RPC 2.0 methods
// ---------------------------------------------------------------------------

/** JSON-RPC parameters for invoking one advertised agent skill. */
export interface A2AInvokeParams {
  skill: string
  input: Record<string, unknown>
  /** Caller context (user id, tenant, trace id). */
  context?: Record<string, unknown>
  /** Set true for streaming via `task/status` notifications. */
  stream?: boolean
}

/** Result envelope returned for an agent task invocation. */
export interface A2AInvokeResult {
  taskId: string
  /** Terminal state for non-streaming invocations; 'running' for stream. */
  status: 'completed' | 'failed' | 'running' | 'requires-approval'
  output?: Record<string, unknown>
  error?: { code: number; message: string; data?: unknown }
}

/** Progress or terminal status payload for a running agent task. */
export interface A2ATaskStatusNotification {
  taskId: string
  status: 'running' | 'completed' | 'failed' | 'requires-approval'
  progress?: number
  partial?: Record<string, unknown>
  output?: Record<string, unknown>
  error?: { code: number; message: string }
}

/** Parameters for cancelling an existing agent task. */
export interface A2ACancelParams {
  taskId: string
  reason?: string
}

/** Parameters for recording an approval decision on an agent task. */
export interface A2AApproveParams {
  taskId: string
  decision: 'approved' | 'rejected'
  approver?: string
  metadata?: Record<string, unknown>
}

/** JSON-RPC method names supported by the A2A protocol helpers. */
export type A2AMethod =
  | 'agent/card'
  | 'task/invoke'
  | 'task/cancel'
  | 'task/approve'
  | 'task/status'

// ---------------------------------------------------------------------------
// Minimal validator
// ---------------------------------------------------------------------------

/**
 * Validate the required agent-card fields and return the typed card.
 * @param raw Untrusted value to validate.
 * @returns The agent card with validated skill names.
 * @throws {Error} If the card or any skill has an invalid required field.
 */
export function validateAgentCard(raw: unknown): A2AAgentCard {
  if (!isRecord(raw)) throw new Error('A2A: agent card must be an object')
  if (typeof raw.id !== 'string') throw new Error('A2A: card.id required')
  if (typeof raw.name !== 'string') throw new Error('A2A: card.name required')
  if (typeof raw.version !== 'string') throw new Error('A2A: card.version required')
  if (!Array.isArray(raw.skills)) throw new Error('A2A: card.skills must be array')
  const skills = raw.skills.map((s: unknown, i: number) => {
    if (!isRecord(s) || typeof s.name !== 'string') {
      throw new Error(`A2A: skills[${i}].name must be a string`)
    }
    return s as unknown as A2ASkillDescriptor
  })
  return { ...(raw as unknown as A2AAgentCard), skills }
}
