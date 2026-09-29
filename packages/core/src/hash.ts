import canonicalize from 'canonicalize'
import { sha256 } from '@noble/hashes/sha2.js'

/**
 * Serialize JSON data using RFC 8785, with object properties sorted recursively.
 * `undefined` object properties are omitted and array entries become `null`,
 * matching JSON round-trip behavior.
 *
 * @param value - JSON-compatible value to serialize.
 * @returns Canonical JSON text suitable for hashing or signing.
 * @throws {TypeError} When the root value has no JSON representation.
 * @since 1.13.0
 * @example
 * canonicalJson({ b: 2, a: 1 }) // '{"a":1,"b":2}'
 */
export function canonicalJson(value: unknown): string { // no-local-canonical-json-ignore: package owner
  const result = canonicalize(value)
  if (result === undefined) throw new TypeError('canonicalJson requires a JSON-compatible root value')
  return result
}

/**
 * Return the lowercase hexadecimal SHA-256 digest of UTF-8 text or bytes.
 *
 * @param value - UTF-8 text or raw bytes to hash.
 * @returns 64 lowercase hexadecimal characters.
 * @since 1.13.0
 * @example
 * sha256Hex('hello')
 */
export function sha256Hex(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  return Array.from(sha256(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
