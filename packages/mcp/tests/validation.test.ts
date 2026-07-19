import { describe, expect, it } from 'vitest'
import { ErrorCodes } from '@agentskit/core'
import {
  assertNonEmptyString,
  assertPositiveInteger,
  assertToolName,
  isRecord,
} from '../src/validation'

describe('MCP validation', () => {
  it('accepts interoperable names and bounded strings', () => {
    expect(assertToolName('admin.tools_v2')).toBe('admin.tools_v2')
    expect(assertNonEmptyString(' value ', 'field', 16)).toBe('value')
    expect(assertPositiveInteger(8, 'steps', 100)).toBe(8)
  })

  it.each(['', 'with space', 'unicode-ç', 'x'.repeat(129)])('rejects invalid tool name %j', (name) => {
    expect(() => assertToolName(name)).toThrow(
      expect.objectContaining({ code: ErrorCodes.AK_CONFIG_INVALID }),
    )
  })

  it('rejects invalid string and integer bounds', () => {
    expect(() => assertNonEmptyString(null, 'field', 8)).toThrow(/non-empty/)
    expect(() => assertNonEmptyString('ééééé', 'field', 8)).toThrow(/8 bytes/)
    expect(() => assertPositiveInteger(Number.NaN, 'steps', 10)).toThrow(/safe integer/)
    expect(() => assertPositiveInteger(11, 'steps', 10)).toThrow(/safe integer/)
  })

  it('recognizes only ordinary records', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord(Object.create(null))).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord(new Proxy({}, { getPrototypeOf: () => { throw new Error('hostile') } }))).toBe(false)
  })
})
