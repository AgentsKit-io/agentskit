import { describe, it, expect } from 'vitest'
import type { JSONSchema7 } from 'json-schema'
import { createAjvValidator } from '../src/ajv-validator'

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    city: { type: 'string' },
    units: { type: 'string', enum: ['C', 'F'] },
  },
  required: ['city'],
}

describe('createAjvValidator', () => {
  it('accepts args that satisfy the schema', () => {
    const validate = createAjvValidator()
    expect(validate(schema, { city: 'Lisbon', units: 'C' })).toEqual({ valid: true })
  })

  it('rejects a missing required field with a path', () => {
    const validate = createAjvValidator()
    const result = validate(schema, { units: 'C' })
    expect(result.valid).toBe(false)
    expect(result.errors?.some(e => /required/i.test(e.message))).toBe(true)
  })

  it('rejects a wrong type and reports the dotted path', () => {
    const validate = createAjvValidator()
    const result = validate(schema, { city: 123 })
    expect(result.valid).toBe(false)
    expect(result.errors?.some(e => e.path === 'city')).toBe(true)
  })

  it('builds a human message with the field path', () => {
    const validate = createAjvValidator()
    const result = validate(schema, { city: 123 })
    expect(result.message).toContain('invalid tool arguments')
    expect(result.message).toContain('city')
  })

  it('rejects an enum violation', () => {
    const validate = createAjvValidator()
    const result = validate(schema, { city: 'Lisbon', units: 'K' })
    expect(result.valid).toBe(false)
    expect(result.errors?.some(e => e.path === 'units')).toBe(true)
  })

  it('allows extra properties by default', () => {
    const validate = createAjvValidator()
    expect(validate(schema, { city: 'Lisbon', extra: true }).valid).toBe(true)
  })

  it('rejects extra properties when rejectAdditionalProperties is set', () => {
    const validate = createAjvValidator({ rejectAdditionalProperties: true })
    expect(validate(schema, { city: 'Lisbon', extra: true }).valid).toBe(false)
  })

  it('coerces types when enabled', () => {
    const numSchema: JSONSchema7 = {
      type: 'object',
      properties: { n: { type: 'number' } },
      required: ['n'],
    }
    const strict = createAjvValidator()
    expect(strict(numSchema, { n: '42' }).valid).toBe(false)
    const lax = createAjvValidator({ coerceTypes: true })
    expect(lax(numSchema, { n: '42' }).valid).toBe(true)
  })

  it('caches compiled validators across calls for the same schema', () => {
    const validate = createAjvValidator()
    expect(validate(schema, { city: 'A' }).valid).toBe(true)
    expect(validate(schema, { city: 'B' }).valid).toBe(true)
  })
})
