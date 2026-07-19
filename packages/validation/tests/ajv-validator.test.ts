import Ajv from 'ajv'
import { describe, it, expect, vi } from 'vitest'
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
    expect(result.errors?.some(e => e.path === 'city')).toBe(true)
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
    const result = validate(schema, { city: 'Lisbon', extra: true })
    expect(result.valid).toBe(false)
    expect(result.errors?.some(error => error.path === 'extra')).toBe(true)
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
    const args: Record<string, unknown> = { n: '42' }
    expect(lax(numSchema, args).valid).toBe(true)
    expect(args.n).toBe(42)
  })

  it('caches compiled validators across calls for the same schema', () => {
    const ajv = new Ajv({ strict: false })
    const compile = vi.spyOn(ajv, 'compile')
    const validate = createAjvValidator({ ajv })
    expect(validate(schema, { city: 'A' }).valid).toBe(true)
    expect(validate(schema, { city: 'B' }).valid).toBe(true)
    expect(compile).toHaveBeenCalledTimes(1)
  })

  it('recursively rejects undeclared properties in objects, arrays, and local refs', () => {
    const nestedSchema: JSONSchema7 = {
      type: 'object',
      definitions: {
        profile: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city'],
        },
      },
      properties: {
        profiles: {
          type: 'array',
          items: { $ref: '#/definitions/profile' },
        },
      },
      required: ['profiles'],
    }
    const validate = createAjvValidator({ rejectAdditionalProperties: true })
    const result = validate(nestedSchema, { profiles: [{ city: 'Lisbon', secret: true }] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ path: 'profiles[0].secret' }))
  })

  it('does not mutate the caller schema while hardening nested boundaries', () => {
    const nestedSchema: JSONSchema7 = {
      type: 'object',
      properties: { profile: { type: 'object', properties: { city: { type: 'string' } } } },
    }
    const before = JSON.stringify(nestedSchema)
    createAjvValidator({ rejectAdditionalProperties: true })(nestedSchema, {
      profile: { city: 'Lisbon' },
    })
    expect(JSON.stringify(nestedSchema)).toBe(before)
  })

  it('preserves explicit additional-property schemas', () => {
    const dictionary: JSONSchema7 = {
      type: 'object',
      additionalProperties: { type: 'string' },
    }
    const validate = createAjvValidator({ rejectAdditionalProperties: true })
    expect(validate(dictionary, { locale: 'pt-BR' }).valid).toBe(true)
    expect(validate(dictionary, { locale: 123 }).valid).toBe(false)
  })

  it('does not synthesize unsafe boundaries across composition keywords', () => {
    const composed: JSONSchema7 = {
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
      allOf: [
        { properties: { a: { minLength: 1 } } },
        { properties: { b: { minimum: 0 } } },
      ],
    }
    const validate = createAjvValidator({ rejectAdditionalProperties: true })
    expect(validate(composed, { a: 'ok', b: 1, extra: true }).valid).toBe(true)

    const authorStrict: JSONSchema7 = { ...composed, additionalProperties: false }
    expect(validate(authorStrict, { a: 'ok', b: 1, extra: true }).valid).toBe(false)
  })

  it('reports nested arrays and escaped JSON Pointer segments without ambiguity', () => {
    const escaped: JSONSchema7 = {
      type: 'object',
      properties: {
        'a/b': {
          type: 'array',
          items: {
            type: 'object',
            properties: { '~key': { type: 'string' } },
            required: ['~key'],
          },
        },
      },
    }
    const result = createAjvValidator()(escaped, { 'a/b': [{ '~key': 3 }] })
    expect(result.errors).toContainEqual(expect.objectContaining({ path: '["a/b"][0]["~key"]' }))
  })

  it('returns independent copies of multiple Ajv errors', () => {
    const validate = createAjvValidator()
    const first = validate(schema, { city: 3, units: 'K' })
    expect(first.valid).toBe(false)
    expect(first.errors).toHaveLength(2)
    validate(schema, { city: 'Lisbon', units: 'C' })
    expect(first.errors).toHaveLength(2)
  })

  it('lets a supplied Ajv instance own coercion behavior', () => {
    const ajv = new Ajv({ strict: false, coerceTypes: true })
    const validate = createAjvValidator({ ajv, coerceTypes: false })
    const numberSchema: JSONSchema7 = {
      type: 'object',
      properties: { value: { type: 'number' } },
    }
    const args: Record<string, unknown> = { value: '7' }
    expect(validate(numberSchema, args).valid).toBe(true)
    expect(args.value).toBe(7)
  })

  it('keeps validator caches and Ajv behavior isolated', () => {
    const coercing = createAjvValidator({ coerceTypes: true })
    const strict = createAjvValidator()
    const numberSchema: JSONSchema7 = { type: 'object', properties: { n: { type: 'number' } } }
    expect(coercing(numberSchema, { n: '1' }).valid).toBe(true)
    expect(strict(numberSchema, { n: '1' }).valid).toBe(false)
  })

  it('propagates invalid trusted schemas as configuration failures', () => {
    const invalidSchema = JSON.parse('{"type":"not-a-json-schema-type"}') as JSONSchema7
    expect(() => createAjvValidator()(invalidSchema, {})).toThrow()
  })

  it('traverses draft-07 schema containers without changing their authored semantics', () => {
    const shared: JSONSchema7 = { type: 'object', properties: { id: { type: 'string' } } }
    const traversalSchema: JSONSchema7 = {
      type: ['object', 'null'],
      patternProperties: { '^x-': shared },
      properties: {
        tuple: {
          type: 'array',
          items: [shared, true],
          additionalItems: false,
          contains: shared,
        },
        repeated: shared,
      },
      propertyNames: { minLength: 1 },
      dependencies: {
        repeated: ['tuple'],
        tuple: { properties: { repeated: shared } },
      },
      definitions: { allowed: true },
      $defs: { denied: false },
      anyOf: [true, { properties: { repeated: shared } }],
      oneOf: [{ not: false }, false],
      if: { required: ['repeated'] },
      then: { required: ['tuple'] },
      else: true,
    }
    const validate = createAjvValidator({ rejectAdditionalProperties: true })
    const result = validate(traversalSchema, {
      tuple: [{ id: 'one' }],
      repeated: { id: 'two' },
    })
    expect(result).toEqual({ valid: true })
  })

  it('uses a safe generic error when a custom compiler returns no diagnostics', () => {
    const ajv = new Ajv({ strict: false })
    const compiled = Object.assign((_data: unknown) => false, { errors: null })
    vi.spyOn(ajv, 'compile').mockReturnValue(compiled as never)
    expect(createAjvValidator({ ajv })(schema, {})).toEqual({
      valid: false,
      errors: [{ path: '', message: 'is invalid' }],
      message: 'invalid tool arguments: is invalid',
    })
  })

  it('fills a missing custom-validator error message without exposing values', () => {
    const ajv = new Ajv({ strict: false })
    const compiled = Object.assign((_data: unknown) => false, {
      errors: [{ instancePath: '', schemaPath: '#', keyword: 'custom', params: {} }],
    })
    vi.spyOn(ajv, 'compile').mockReturnValue(compiled as never)
    const result = createAjvValidator({ ajv })(schema, { secret: 'do-not-report' })
    expect(result.errors).toEqual([{ path: '', message: 'is invalid' }])
    expect(result.message).not.toContain('do-not-report')
  })
})
