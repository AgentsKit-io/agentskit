import type { ToolDefinition } from '@agentskit/core'
import { readText } from '@agentskit/net'

const HOSTED = 'https://registry.agentskit.io/r'
const RAW = 'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main'
const REGISTRY_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/
const TOOL_NAME = /^[A-Za-z0-9_.-]{1,128}$/

type JsonSchema = NonNullable<ToolDefinition['schema']>

/** A validated text skill projection returned by the registry. */
export interface FetchedAgentSkill {
  /** Registry ID. */
  id: string
  /** Display description, or the registry ID when absent. */
  description: string
  /** Prompt text supplied by the skill. */
  systemPrompt: string
}

/** A validated typed MCP projection returned by the registry. */
export interface FetchedTypedAgent extends FetchedAgentSkill {
  /** Identifies this result as a typed MCP projection. */
  mode: 'typed'
  /** Input JSON Schema for the typed tool. */
  inputSchema: JsonSchema
  /** Output JSON Schema for the typed tool. */
  outputSchema: JsonSchema
  /** MCP tool name used to submit the typed result. */
  resultToolName: string
}

/** A registry agent exposed as either a text skill or a typed MCP tool. */
export type FetchedAgent = FetchedAgentSkill | FetchedTypedAgent

/** Options shared by the registry fetch functions. */
export interface FetchAgentSkillOptions {
  /** Per-request timeout in milliseconds. Default 10000; accepted range is 1–120000. */
  timeoutMs?: number
  /** Maximum response bytes. Default 131072; accepted range is 1–1048576. */
  maxResponseBytes?: number
  /** Cancels the active read and prevents later fallback requests. */
  signal?: AbortSignal
}

const isRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input)

const readTypedMcpProjection = (input: Record<string, unknown>): Omit<FetchedTypedAgent, 'id' | 'description' | 'systemPrompt'> | null | undefined => {
  const projections = input.projections
  if (!isRecord(projections)) return undefined
  const mcp = projections.mcp
  if (!isRecord(mcp) || mcp.mode === undefined) return undefined
  if (mcp.mode !== 'typed') return undefined
  if (!isRecord(mcp.inputSchema) || !isRecord(mcp.outputSchema)) return null
  if (typeof mcp.resultToolName !== 'string' || !TOOL_NAME.test(mcp.resultToolName)) return null
  return {
    inputSchema: mcp.inputSchema as JsonSchema,
    mode: 'typed',
    outputSchema: mcp.outputSchema as JsonSchema,
    resultToolName: mcp.resultToolName,
  }
}

const boundedString = (input: unknown, maximum: number): string | null => {
  if (typeof input !== 'string' || input.trim().length === 0) return null
  return new TextEncoder().encode(input).byteLength <= maximum ? input.trim() : null
}

const requestText = async (
  url: string,
  fetchImpl: typeof fetch,
  options: Required<Pick<FetchAgentSkillOptions, 'maxResponseBytes' | 'timeoutMs'>> &
    Pick<FetchAgentSkillOptions, 'signal'>,
): Promise<string | null> => {
  if (options.signal?.aborted) return null
  const controller = new AbortController()
  let resolveAbort: ((value: null) => void) | undefined
  const aborted = new Promise<null>((resolve) => {
    resolveAbort = resolve
  })
  const abort = (): void => {
    controller.abort()
    resolveAbort?.(null)
  }
  options.signal?.addEventListener('abort', abort, { once: true })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const request = (async (): Promise<string | null> => {
      const response = await fetchImpl(url, { signal: controller.signal })
      if (!response.ok) return null
      return await readText(response, { maxBytes: options.maxResponseBytes })
    })().catch(() => null)
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        controller.abort()
        resolve(null)
      }, options.timeoutMs)
    })
    return await Promise.race([request, timeout, aborted])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}

const requestJson = async (
  url: string,
  fetchImpl: typeof fetch,
  options: Required<Pick<FetchAgentSkillOptions, 'maxResponseBytes' | 'timeoutMs'>> &
    Pick<FetchAgentSkillOptions, 'signal'>,
): Promise<unknown | null> => {
  const text = await requestText(url, fetchImpl, options)
  if (text === null) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/**
 * Fetch a registry agent, preserving typed MCP projections when present.
 * Unreadable hosted data or data without a usable projection falls back to the
 * raw registry; an explicit null skill or malformed typed projection resolves
 * to `null`. Reads default to 10000 ms and 131072 bytes per response.
 *
 * The result is `null` for invalid IDs or bounds, an aborted operation, or
 * when neither source provides a supported agent. A hosted timeout, HTTP
 * failure, malformed JSON, or oversized response may still succeed through
 * raw fallback. Oversized reads use `AK_NET_BODY_TOO_LARGE` internally; no
 * network error code is exposed by this null-returning API.
 *
 * @param id Lowercase kebab-case registry ID.
 * @param fetchImpl Fetch implementation, defaulting to `globalThis.fetch`.
 * @param options Timeout, response-size, and abort settings.
 * @returns A skill or typed projection, or `null` when no supported result is available.
 *
 * @example
 * ```ts
 * const agent = await fetchAgent('legal-review', fetch, { maxResponseBytes: 131072 })
 * if (agent && 'mode' in agent) console.log(agent.resultToolName)
 * ```
 */
export async function fetchAgent(
  id: string,
  fetchImpl: typeof fetch = globalThis.fetch,
  options: FetchAgentSkillOptions = {},
): Promise<FetchedAgent | null> {
  if (!REGISTRY_ID.test(id) || typeof fetchImpl !== 'function') return null
  const timeoutMs = options.timeoutMs ?? 10_000
  const maxResponseBytes = options.maxResponseBytes ?? 131_072
  if (
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000 ||
    !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > 1_048_576
  ) return null
  const bounds = { maxResponseBytes, signal: options.signal, timeoutMs }

  const hosted = await requestJson(`${HOSTED}/${id}.json`, fetchImpl, bounds)
  if (isRecord(hosted)) {
    const typed = readTypedMcpProjection(hosted)
    if (typed === null) return null
    if (hosted.skill === null) return null
    if (isRecord(hosted.skill)) {
      const systemPrompt = boundedString(hosted.skill.systemPrompt, 65_536)
      if (systemPrompt) {
        const description = boundedString(hosted.description, 4096) ?? id
        if (typed) return Object.freeze({ description, id, systemPrompt, ...typed })
        return Object.freeze({ description, id, systemPrompt })
      }
    }
  }

  if (options.signal?.aborted) return null
  const meta = await requestJson(`${RAW}/registry/${id}/meta.json`, fetchImpl, bounds)
  if (!isRecord(meta)) return null
  const typed = readTypedMcpProjection(meta)
  if (typed === null) return null
  if (options.signal?.aborted) return null
  const source = await requestText(`${RAW}/registry/${id}/agent.ts`, fetchImpl, bounds)
  if (!source) return null
  const match = source.match(/systemPrompt:\s*`((?:\\.|[^`\\])*)`/)
  if (!match) return null
  const systemPrompt = boundedString(
    match[1].replace(/\\`/g, '`').replace(/\\\$\{/g, '${'),
    65_536,
  )
  if (!systemPrompt) return null
  const skill = {
    id,
    description: boundedString(meta.description, 4096) ?? id,
    systemPrompt,
  }
  return Object.freeze(typed ? { ...skill, ...typed } : skill)
}

/**
 * Fetch a text skill from the registry. Typed MCP projections resolve to
 * `null` so they cannot be flattened into a generic text tool.
 *
 * Reads default to 10000 ms and 131072 bytes per response. Unreadable hosted
 * data may fall back to raw registry files; a hosted timeout, HTTP failure,
 * malformed JSON, or oversized body may therefore still produce a skill.
 * Typed projections, invalid IDs or bounds, aborted operations, and requests
 * for which neither source provides a supported text skill resolve to `null`.
 * Oversized reads use `AK_NET_BODY_TOO_LARGE` internally; network error codes
 * are not exposed.
 *
 * @param id Lowercase kebab-case registry ID.
 * @param fetchImpl Fetch implementation, defaulting to `globalThis.fetch`.
 * @param options Timeout, response-size, and abort settings.
 * @returns A text skill, or `null` for typed projections or when no supported skill is available.
 *
 * @example
 * ```ts
 * const skill = await fetchAgentSkill('legal-review', fetch, { timeoutMs: 10000 })
 * if (skill) console.log(skill.systemPrompt)
 * ```
 */
export async function fetchAgentSkill(
  id: string,
  fetchImpl: typeof fetch = globalThis.fetch,
  options: FetchAgentSkillOptions = {},
): Promise<FetchedAgentSkill | null> {
  const agent = await fetchAgent(id, fetchImpl, options)
  return agent && 'mode' in agent && agent.mode === 'typed' ? null : agent
}
