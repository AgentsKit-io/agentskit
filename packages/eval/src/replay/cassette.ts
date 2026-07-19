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
    if (!isPlainObject(message) || typeof message.content !== 'string') {
      throw invalidCassette(
        `Invalid cassette: entries[${index}].request.messages[${messageIndex}] must contain string content`,
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
    if (!isPlainObject(chunk) || typeof chunk.type !== 'string') {
      throw invalidCassette(
        `Invalid cassette: entries[${index}].chunks[${chunkIndex}] must contain a string type`,
      )
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
  const messages = request.messages.map(m => `${m.role}:${m.content ?? ''}`).join('|')
  const c = request.context
  const ctxStr = c
    ? JSON.stringify({
        s: c.systemPrompt ?? null,
        t: c.temperature ?? null,
        m: c.maxTokens ?? null,
        tn: c.tools?.map(t => t.name).sort() ?? null,
      })
    : ''
  return `${messages}::${ctxStr}`
}

export function lastUserContent(request: AdapterRequest): string {
  for (let i = request.messages.length - 1; i >= 0; i--) {
    const m = request.messages[i]
    if (m?.role === 'user') return m.content ?? ''
  }
  return ''
}
