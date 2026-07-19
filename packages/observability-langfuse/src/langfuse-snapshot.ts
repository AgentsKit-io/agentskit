import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { LangfuseConfig } from './langfuse-types'

export const SNAPSHOT_LIMIT = 200
export const TAG_LIMIT = 50

export function envOr(k: string, fallback?: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return fallback
  return process.env[k] ?? fallback
}

export function isLlmSpan(name: string): boolean {
  return name.startsWith('gen_ai')
}

export function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `langfuse: ${name} must be a finite positive integer (received ${String(value)})`,
      hint: 'Pass a positive whole number (e.g. flushAt: 15).',
    })
  }
}

export function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `langfuse: ${name} must be a finite positive number (received ${String(value)})`,
      hint: 'Pass a finite value > 0 (e.g. flushInterval: 1000).',
    })
  }
}

export function boundString(value: string, limit = SNAPSHOT_LIMIT): string {
  return value.length > limit ? value.slice(0, limit) : value
}

/** Safe, limited snapshot of tags/data — never throws. */
export function snapshotTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) return undefined
  try {
    const out: string[] = []
    const max = Math.min(tags.length, TAG_LIMIT)
    for (let i = 0; i < max; i++) {
      const raw = tags[i]
      out.push(boundString(typeof raw === 'string' ? raw : String(raw)))
    }
    return out
  } catch {
    return undefined
  }
}

export function safeJson(value: unknown): string {
  try {
    const seen = new WeakSet<object>()
    const json = JSON.stringify(value, (_k, current: unknown) => {
      if (typeof current === 'bigint') return current.toString()
      if (typeof current === 'object' && current !== null) {
        if (seen.has(current)) return '[Circular]'
        seen.add(current)
      }
      return current
    })
    return json ?? 'null'
  } catch {
    return '[Unserializable]'
  }
}

export function snapshotMetadata(attributes: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  try {
    const keys = Object.keys(attributes)
    const max = Math.min(keys.length, 40)
    for (let i = 0; i < max; i++) {
      const key = keys[i]!
      const value = attributes[key]
      if (typeof value === 'string') {
        out[key] = boundString(value, 500)
      } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
        out[key] = typeof value === 'number' && !Number.isFinite(value) ? String(value) : value
      } else if (typeof value === 'bigint') {
        out[key] = value.toString()
      } else if (value === undefined) {
        // skip
      } else {
        out[key] = boundString(safeJson(value), 500)
      }
    }
  } catch {
    // return whatever we collected
  }
  return out
}

export function validateConfig(config: LangfuseConfig): void {
  if (config.flushAt !== undefined) assertPositiveInteger('flushAt', config.flushAt)
  if (config.flushInterval !== undefined) assertPositiveFinite('flushInterval', config.flushInterval)
}
