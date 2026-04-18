import type { AdapterRequest } from '@agentskit/core'
import type { Cassette } from './types'

export function createCassette(init: Partial<Cassette> = {}): Cassette {
  return {
    version: 1,
    seed: init.seed,
    metadata: init.metadata,
    entries: init.entries ?? [],
  }
}

export function serializeCassette(cassette: Cassette): string {
  return JSON.stringify(cassette, null, 2)
}

export function parseCassette(input: string): Cassette {
  const parsed = JSON.parse(input) as Cassette
  if (parsed.version !== 1) {
    throw new Error(`Unsupported cassette version: ${String(parsed.version)}`)
  }
  if (!Array.isArray(parsed.entries)) {
    throw new Error('Invalid cassette: entries missing')
  }
  return parsed
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
