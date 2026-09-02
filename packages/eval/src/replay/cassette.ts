import { ConfigError, ErrorCodes, type AdapterRequest } from '@agentskit/core'
import { defensiveSnapshot } from './clone'
import type { Cassette, CassetteEntry } from './types'

export function createCassette(init: Partial<Cassette> = {}): Cassette {
  return {
    version: 1,
    seed: init.seed,
    metadata: init.metadata !== undefined ? defensiveSnapshot(init.metadata) : undefined,
    entries: init.entries !== undefined ? defensiveSnapshot(init.entries) : [],
  }
}

export function serializeCassette(cassette: Cassette): string {
  return JSON.stringify(cassette, null, 2)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const MESSAGE_ROLES = new Set(['user', 'assistant', 'system', 'tool'])
const MESSAGE_STATUSES = new Set(['pending', 'streaming', 'complete', 'error'])
const CHUNK_TYPES = new Set(['text', 'tool_call', 'tool_result', 'reasoning', 'usage', 'error', 'done'])

function invalidCassette(message: string, cause?: unknown): ConfigError {
  return new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message,
    ...(cause !== undefined ? { cause } : {}),
  })
}

function assertCassetteEntry(entry: unknown, index: number): asserts entry is CassetteEntry {
  if (!isPlainObject(entry)) {
    throw invalidCassette(`Invalid cassette: entries[${index}] must be an object`)
  }
  if (!isPlainObject(entry.request)) {
    throw invalidCassette(`Invalid cassette: entries[${index}].request must be an object`)
  }
  const messages = (entry.request as { messages?: unknown }).messages
  if (!Array.isArray(messages)) {
    throw invalidCassette(`Invalid cassette: entries[${index}].request.messages must be an array`)
  }
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
    const message = messages[messageIndex]
    if (
      !isPlainObject(message) ||
      typeof message.id !== 'string' ||
      typeof message.role !== 'string' ||
      !MESSAGE_ROLES.has(message.role) ||
      typeof message.content !== 'string' ||
      typeof message.status !== 'string' ||
      !MESSAGE_STATUSES.has(message.status)
    ) {
      throw invalidCassette(
        `Invalid cassette: entries[${index}].request.messages[${messageIndex}] has an invalid message shape`,
      )
    }
    if (
      typeof message.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(message.createdAt))
    ) {
      throw invalidCassette(
        `Invalid cassette: entries[${index}].request.messages[${messageIndex}].createdAt must be an ISO date string`,
      )
    }
  }
  if (!Array.isArray(entry.chunks)) {
    throw invalidCassette(`Invalid cassette: entries[${index}].chunks must be an array`)
  }
  for (let chunkIndex = 0; chunkIndex < entry.chunks.length; chunkIndex++) {
    const chunk = entry.chunks[chunkIndex]
    if (!isPlainObject(chunk) || typeof chunk.type !== 'string' || !CHUNK_TYPES.has(chunk.type)) {
      throw invalidCassette(
        `Invalid cassette: entries[${index}].chunks[${chunkIndex}] has an invalid type`,
      )
    }
    if (chunk.metadata !== undefined && !isPlainObject(chunk.metadata)) {
      throw invalidCassette(
        `Invalid cassette: entries[${index}].chunks[${chunkIndex}].metadata must be an object`,
      )
    }
    if (
      (chunk.type === 'text' || chunk.type === 'reasoning' || chunk.type === 'error') &&
      chunk.content !== undefined &&
      typeof chunk.content !== 'string'
    ) {
      throw invalidCassette(
        `Invalid cassette: entries[${index}].chunks[${chunkIndex}].content must be a string`,
      )
    }
    if (chunk.type === 'tool_call' || chunk.type === 'tool_result') {
      const toolCall = chunk.toolCall
      if (
        !isPlainObject(toolCall) ||
        typeof toolCall.id !== 'string' ||
        typeof toolCall.name !== 'string' ||
        typeof toolCall.args !== 'string' ||
        (toolCall.result !== undefined && typeof toolCall.result !== 'string')
      ) {
        throw invalidCassette(
          `Invalid cassette: entries[${index}].chunks[${chunkIndex}].toolCall has an invalid shape`,
        )
      }
    }
    if (chunk.type === 'usage') {
      const usage = chunk.usage
      if (
        !isPlainObject(usage) ||
        !['promptTokens', 'completionTokens', 'totalTokens'].every(
          key => typeof usage[key] === 'number' && Number.isFinite(usage[key]) && usage[key] >= 0,
        )
      ) {
        throw invalidCassette(
          `Invalid cassette: entries[${index}].chunks[${chunkIndex}].usage has an invalid shape`,
        )
      }
    }
  }
}

export function parseCassette(input: string): Cassette {
  let parsed: unknown
  try {
    parsed = JSON.parse(input) as unknown
  } catch (cause) {
    throw invalidCassette('Invalid cassette: not valid JSON', cause)
  }
  if (!isPlainObject(parsed)) {
    throw invalidCassette('Invalid cassette: root must be an object')
  }
  if (parsed.version !== 1) {
    throw invalidCassette(`Unsupported cassette version: ${String(parsed.version)}`)
  }
  if (!Array.isArray(parsed.entries)) {
    throw invalidCassette('Invalid cassette: entries missing')
  }
  if (
    parsed.seed !== undefined &&
    typeof parsed.seed !== 'string' &&
    (typeof parsed.seed !== 'number' || !Number.isFinite(parsed.seed))
  ) {
    throw invalidCassette('Invalid cassette: seed must be a string or finite number')
  }
  if (parsed.metadata !== undefined && !isPlainObject(parsed.metadata)) {
    throw invalidCassette('Invalid cassette: metadata must be an object')
  }
  for (let i = 0; i < parsed.entries.length; i++) {
    assertCassetteEntry(parsed.entries[i], i)
  }
  const cassette = defensiveSnapshot({
    version: 1 as const,
    seed: parsed.seed as Cassette['seed'],
    metadata: parsed.metadata as Cassette['metadata'],
    entries: parsed.entries as CassetteEntry[],
  })
  for (const entry of cassette.entries) {
    for (const message of entry.request.messages) {
      message.createdAt = new Date(message.createdAt as unknown as string)
    }
  }
  return cassette
}

export function fingerprintRequest(request: AdapterRequest): string {
  const seen = new WeakSet<object>()

  const canonicalize = (value: unknown, path: string): unknown => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw invalidCassette(`Cannot fingerprint ${path}: number is not finite`)
      return value
    }
    if (value instanceof Date) {
      if (!Number.isFinite(value.getTime())) throw invalidCassette(`Cannot fingerprint ${path}: invalid date`)
      return { $date: value.toISOString() }
    }
    if (typeof value !== 'object') {
      throw invalidCassette(`Cannot fingerprint ${path}: unsupported value`)
    }

    if (seen.has(value)) throw invalidCassette(`Cannot fingerprint ${path}: cyclic value`)
    seen.add(value)
    try {
      if (Array.isArray(value)) return value.map((item, index) => canonicalize(item, `${path}[${index}]`))
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Object.prototype && prototype !== null) {
        throw invalidCassette(`Cannot fingerprint ${path}: unsupported object`)
      }
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        const child = (value as Record<string, unknown>)[key]
        if (child === undefined) continue
        out[key] = canonicalize(child, `${path}.${key}`)
      }
      return out
    } finally {
      seen.delete(value)
    }
  }

  // Tool callbacks are executable values, not provider request data. The
  // serializable tool contract remains in the fingerprint so schema changes
  // cannot reuse a cassette accidentally.
  const messages = request.messages.map(message => ({
    role: message.role,
    content: message.content,
    parts: message.parts,
    toolCalls: message.toolCalls,
    toolCallId: message.toolCallId,
    metadata: message.metadata,
  }))
  const tools = request.context?.tools?.map(tool => ({
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    requiresConfirmation: tool.requiresConfirmation,
    tags: tool.tags,
    category: tool.category,
  }))
  return JSON.stringify(canonicalize({
    messages,
    context: request.context
      ? {
          systemPrompt: request.context.systemPrompt,
          temperature: request.context.temperature,
          maxTokens: request.context.maxTokens,
          metadata: request.context.metadata,
          tools,
        }
      : undefined,
  }, 'request'))
}

export function lastUserContent(request: AdapterRequest): string {
  for (let i = request.messages.length - 1; i >= 0; i--) {
    const m = request.messages[i]
    if (m?.role === 'user') return m.content ?? ''
  }
  return ''
}
