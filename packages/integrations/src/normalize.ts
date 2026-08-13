import type { NormalizedEvent } from './contract'

export type JsonRecordResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false }

export function parseJsonRecord(raw: unknown): JsonRecordResult {
  const value = typeof raw === 'string' ? parseString(raw) : raw
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false }
  return { ok: true, value: value as Record<string, unknown> }
}

function parseString(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

export function invalidJsonEvent(raw: unknown): NormalizedEvent {
  return { kind: 'invalid_payload', payload: { reason: 'invalid_json' }, raw }
}
