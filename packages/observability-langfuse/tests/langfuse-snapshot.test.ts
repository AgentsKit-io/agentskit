import { afterEach, describe, expect, it } from 'vitest'
import { ConfigError, ErrorCodes } from '@agentskit/core'
import {
  SNAPSHOT_LIMIT,
  TAG_LIMIT,
  assertPositiveFinite,
  assertPositiveInteger,
  boundString,
  envOr,
  isLlmSpan,
  safeJson,
  snapshotMetadata,
  snapshotTags,
  validateConfig,
} from '../src/langfuse-snapshot'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key]
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('limits', () => {
  it('exports finite positive snapshot and tag ceilings', () => {
    expect(SNAPSHOT_LIMIT).toBe(200)
    expect(TAG_LIMIT).toBe(50)
    expect(Number.isFinite(SNAPSHOT_LIMIT)).toBe(true)
    expect(Number.isFinite(TAG_LIMIT)).toBe(true)
  })
})

describe('envOr', () => {
  it('reads process.env and falls back when unset', () => {
    process.env.AK_LANGFUSE_TEST_KEY = 'from-env'
    expect(envOr('AK_LANGFUSE_TEST_KEY')).toBe('from-env')
    delete process.env.AK_LANGFUSE_TEST_KEY
    expect(envOr('AK_LANGFUSE_TEST_KEY')).toBeUndefined()
    expect(envOr('AK_LANGFUSE_TEST_KEY', 'fallback')).toBe('fallback')
  })
})

describe('isLlmSpan', () => {
  it('detects gen_ai-prefixed span names only', () => {
    expect(isLlmSpan('gen_ai.chat')).toBe(true)
    expect(isLlmSpan('gen_ai')).toBe(true)
    expect(isLlmSpan('tool.call')).toBe(false)
    expect(isLlmSpan('GEN_AI.chat')).toBe(false)
  })
})

describe('assertPositiveInteger / assertPositiveFinite', () => {
  it('accepts valid positive integers and finite positives', () => {
    expect(() => assertPositiveInteger('flushAt', 15)).not.toThrow()
    expect(() => assertPositiveInteger('flushAt', 1)).not.toThrow()
    expect(() => assertPositiveFinite('flushInterval', 1000)).not.toThrow()
    expect(() => assertPositiveFinite('flushInterval', 0.5)).not.toThrow()
  })

  it('rejects non-integer, non-positive, and non-finite values with ConfigError', () => {
    const badInts = [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]
    for (const value of badInts) {
      try {
        assertPositiveInteger('flushAt', value)
        expect.unreachable(`expected ConfigError for flushAt=${String(value)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
        expect((error as ConfigError).message).toMatch(/flushAt/)
      }
    }

    const badFinite = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]
    for (const value of badFinite) {
      try {
        assertPositiveFinite('flushInterval', value)
        expect.unreachable(`expected ConfigError for flushInterval=${String(value)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
        expect((error as ConfigError).message).toMatch(/flushInterval/)
      }
    }
  })
})

describe('boundString', () => {
  it('truncates at SNAPSHOT_LIMIT by default and honors a custom limit', () => {
    const long = 'x'.repeat(SNAPSHOT_LIMIT + 50)
    expect(boundString(long)).toHaveLength(SNAPSHOT_LIMIT)
    expect(boundString('short')).toBe('short')
    expect(boundString('abcdefghij', 4)).toBe('abcd')
  })
})

describe('snapshotTags', () => {
  it('returns undefined for missing tags and bounds length + string size', () => {
    expect(snapshotTags(undefined)).toBeUndefined()

    const tags = Array.from({ length: TAG_LIMIT + 10 }, (_, i) => `tag-${i}`)
    const snapped = snapshotTags(tags)
    expect(snapped).toHaveLength(TAG_LIMIT)
    expect(snapped?.[0]).toBe('tag-0')

    const longTag = 'y'.repeat(SNAPSHOT_LIMIT + 20)
    expect(snapshotTags([longTag])?.[0]).toHaveLength(SNAPSHOT_LIMIT)
  })

  it('coerces non-string tag entries via String()', () => {
    const snapped = snapshotTags([123 as unknown as string, true as unknown as string])
    expect(snapped).toEqual(['123', 'true'])
  })
})

describe('safeJson', () => {
  it('serializes plain values and converts BigInt to string', () => {
    expect(safeJson({ a: 1, b: 'x' })).toBe(JSON.stringify({ a: 1, b: 'x' }))
    expect(safeJson(42n)).toBe('"42"')
    expect(safeJson({ n: 99n })).toBe(JSON.stringify({ n: '99' }))
  })

  it('replaces circular references without throwing', () => {
    const circular: Record<string, unknown> = { ok: true }
    circular.self = circular
    const json = safeJson(circular)
    expect(json).toContain('[Circular]')
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('returns a stable marker for unserializable values', () => {
    // BigInt at top-level is handled; force a throw path via a toJSON that throws.
    const hostile = {
      toJSON() {
        throw new Error('nope')
      },
    }
    expect(safeJson(hostile)).toBe('[Unserializable]')
  })
})

describe('snapshotMetadata', () => {
  it('keeps primitives, stringifies BigInt, and stringifies non-finite numbers', () => {
    const out = snapshotMetadata({
      name: 'span',
      count: 3,
      ok: true,
      empty: null,
      big: 10n,
      nan: Number.NaN,
      inf: Number.POSITIVE_INFINITY,
      ninf: Number.NEGATIVE_INFINITY,
      skip: undefined,
    })
    expect(out.name).toBe('span')
    expect(out.count).toBe(3)
    expect(out.ok).toBe(true)
    expect(out.empty).toBeNull()
    expect(out.big).toBe('10')
    expect(out.nan).toBe('NaN')
    expect(out.inf).toBe('Infinity')
    expect(out.ninf).toBe('-Infinity')
    expect('skip' in out).toBe(false)
  })

  it('bounds string values and nested JSON snapshots at 500 chars', () => {
    const long = 'z'.repeat(600)
    const out = snapshotMetadata({
      long,
      nested: { deep: long },
    })
    expect(out.long).toHaveLength(500)
    expect(typeof out.nested).toBe('string')
    expect((out.nested as string).length).toBeLessThanOrEqual(500)
  })

  it('caps the number of keys at 40 and handles circular objects', () => {
    const many: Record<string, unknown> = {}
    for (let i = 0; i < 50; i++) many[`k${i}`] = i
    const capped = snapshotMetadata(many)
    expect(Object.keys(capped)).toHaveLength(40)

    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular
    const snapped = snapshotMetadata({ cycle: circular })
    expect(String(snapped.cycle)).toContain('[Circular]')
  })
})

describe('validateConfig', () => {
  it('accepts empty config and valid flush knobs', () => {
    expect(() => validateConfig({})).not.toThrow()
    expect(() => validateConfig({ flushAt: 15, flushInterval: 1000 })).not.toThrow()
  })

  it('rejects invalid flushAt / flushInterval via ConfigError', () => {
    for (const flushAt of [0, -1, 1.2, Number.NaN]) {
      try {
        validateConfig({ flushAt })
        expect.unreachable(`expected ConfigError for flushAt=${String(flushAt)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
    for (const flushInterval of [0, -5, Number.POSITIVE_INFINITY]) {
      try {
        validateConfig({ flushInterval })
        expect.unreachable(`expected ConfigError for flushInterval=${String(flushInterval)}`)
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError)
        expect((error as ConfigError).code).toBe(ErrorCodes.AK_CONFIG_INVALID)
      }
    }
  })
})
