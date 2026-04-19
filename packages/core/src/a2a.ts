/**
 * Agent-to-Agent Protocol (A2A) — minimal open spec for one agent to
 * invoke another over JSON-RPC 2.0. Companion to MCP (which is
 * model-to-tool); A2A is agent-to-agent task delegation, approvals,
 * and streaming status updates.
 *
 * Version: 2026-04.
 */

export const A2A_PROTOCOL_VERSION = '2026-04'

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

export interface A2AInvokeParams {
  skill: string
  input: Record<string, unknown>
  /** Caller context (user id, tenant, trace id). */
  context?: Record<string, unknown>
  /** Set true for streaming via `task/status` notifications. */
  stream?: boolean
}

export interface A2AInvokeResult {
  taskId: string
  /** Terminal state for non-streaming invocations; 'running' for stream. */
  status: 'completed' | 'failed' | 'running' | 'requires-approval'
  output?: Record<string, unknown>
  error?: { code: number; message: string; data?: unknown }
}

export interface A2ATaskStatusNotification {
  taskId: string
  status: 'running' | 'completed' | 'failed' | 'requires-approval'
  progress?: number
  partial?: Record<string, unknown>
  output?: Record<string, unknown>
  error?: { code: number; message: string }
}

export interface A2ACancelParams {
  taskId: string
  reason?: string
}

export interface A2AApproveParams {
  taskId: string
  decision: 'approved' | 'rejected'
  approver?: string
  metadata?: Record<string, unknown>
}

export type A2AMethod =
  | 'agent/card'
  | 'task/invoke'
  | 'task/cancel'
  | 'task/approve'
  | 'task/status'

// ---------------------------------------------------------------------------
// Minimal validator
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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
