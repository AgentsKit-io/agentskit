import { describe, expect, it } from 'vitest'
import { canonicalJson, sha256Hex } from '../src/hash'

describe('canonicalJson', () => {
  it('uses RFC 8785 key order and JSON primitive serialization', () => {
    expect(canonicalJson({ z: [3, { b: 2, a: 1 }], a: '€' })).toBe('{"a":"€","z":[3,{"a":1,"b":2}]}')
  })

  it('keeps hashes stable when undefined fields are removed by a JSON round trip', () => {
    const value = { keep: { present: true, omitted: undefined }, absent: undefined }
    const roundTripped = JSON.parse(JSON.stringify(value)) as typeof value
    const canonical = canonicalJson(value)

    expect(canonical).toBe(canonicalJson(roundTripped))
    expect(sha256Hex(canonical)).toBe(sha256Hex(canonicalJson(roundTripped)))
  })
})

describe('sha256Hex', () => {
  it('returns the lowercase SHA-256 digest of UTF-8 text and raw bytes', () => {
    const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    expect(sha256Hex('abc')).toBe(expected)
    expect(sha256Hex(new TextEncoder().encode('abc'))).toBe(expected)
  })
})
