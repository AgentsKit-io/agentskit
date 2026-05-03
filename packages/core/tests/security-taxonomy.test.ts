import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  compilePIITaxonomy,
  createPIIRedactor,
  PII_TAXONOMY_JSON_SCHEMA,
  validatePIITaxonomy,
  type PIITaxonomy,
} from '../src/security'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_TAXONOMY_PATH = resolve(HERE, '../src/security/default-taxonomy.json')

function load(): PIITaxonomy {
  return JSON.parse(readFileSync(DEFAULT_TAXONOMY_PATH, 'utf8')) as PIITaxonomy
}

describe('validatePIITaxonomy', () => {
  it('accepts the shipped default taxonomy', () => {
    const result = validatePIITaxonomy(load())
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('rejects non-object input', () => {
    expect(validatePIITaxonomy(null).ok).toBe(false)
    expect(validatePIITaxonomy('not a taxonomy').ok).toBe(false)
    expect(validatePIITaxonomy(42).ok).toBe(false)
  })

  it('rejects wrong version', () => {
    const result = validatePIITaxonomy({ version: '2', rules: [] })
    expect(result.ok).toBe(false)
    expect(result.issues[0]?.path).toBe('version')
  })

  it('rejects rules not being an array', () => {
    const result = validatePIITaxonomy({ version: '1', rules: 'oops' })
    expect(result.ok).toBe(false)
    expect(result.issues.some(i => i.path === 'rules')).toBe(true)
  })

  it('flags invalid name format', () => {
    const result = validatePIITaxonomy({
      version: '1',
      rules: [{ name: 'BadName', pattern: 'x' }],
    })
    expect(result.issues.some(i => i.path === 'rules[0].name')).toBe(true)
  })

  it('flags duplicate names', () => {
    const result = validatePIITaxonomy({
      version: '1',
      rules: [
        { name: 'email', pattern: 'a' },
        { name: 'email', pattern: 'b' },
      ],
    })
    expect(result.issues.some(i => /duplicate/i.test(i.message))).toBe(true)
  })

  it('flags invalid regex source', () => {
    const result = validatePIITaxonomy({
      version: '1',
      rules: [{ name: 'broken', pattern: '[unterminated' }],
    })
    expect(result.issues.some(i => i.path === 'rules[0].pattern')).toBe(true)
  })

  it('flags non-string replacer', () => {
    const result = validatePIITaxonomy({
      version: '1',
      rules: [{ name: 'r', pattern: 'x', replacer: 42 }],
    })
    expect(result.issues.some(i => i.path === 'rules[0].replacer')).toBe(true)
  })

  it('returns ALL issues, not just the first', () => {
    const result = validatePIITaxonomy({
      version: '1',
      rules: [
        { name: 'BAD', pattern: 'x' },
        { name: 'also-bad', pattern: '[' },
      ],
    })
    expect(result.issues.length).toBeGreaterThanOrEqual(2)
  })
})

describe('compilePIITaxonomy', () => {
  it('compiles the default taxonomy and matches the in-code defaults', () => {
    const compiled = compilePIITaxonomy(load())
    const redactor = createPIIRedactor({ rules: compiled })
    const { value, hits } = redactor.redact('Email me alice@example.com or call 555-123-4567')
    expect(value).toContain('[REDACTED_EMAIL]')
    expect(value).toContain('[REDACTED_PHONE]')
    expect(hits.map(h => h.rule).sort()).toEqual(['email', 'phone'])
  })

  it('forces the global flag when missing so global replace works', () => {
    const compiled = compilePIITaxonomy({
      version: '1',
      rules: [{ name: 'word', pattern: 'foo', flags: 'i', replacer: '***' }],
    })
    const redactor = createPIIRedactor({ rules: compiled })
    expect(redactor.redact('FOO foo Foo').value).toBe('*** *** ***')
  })

  it('falls back to bracketed default replacer when none provided', () => {
    const compiled = compilePIITaxonomy({
      version: '1',
      rules: [{ name: 'cust-id', pattern: 'CUST-\\d+' }],
    })
    const redactor = createPIIRedactor({ rules: compiled })
    expect(redactor.redact('CUST-42').value).toBe('[REDACTED_CUST-ID]')
  })

  it('throws on invalid taxonomy with a useful summary', () => {
    expect(() =>
      compilePIITaxonomy({
        version: '1',
        rules: [{ name: 'BAD', pattern: 'x' } as never],
      } as PIITaxonomy),
    ).toThrow(/invalid PII taxonomy.*name/)
  })
})

describe('PII_TAXONOMY_JSON_SCHEMA', () => {
  it('is a Draft-7 schema with the published $id', () => {
    expect(PII_TAXONOMY_JSON_SCHEMA.$schema).toContain('draft-07')
    expect(PII_TAXONOMY_JSON_SCHEMA.$id).toContain('pii-taxonomy/v1')
    expect(PII_TAXONOMY_JSON_SCHEMA.required).toEqual(['version', 'rules'])
  })
})
