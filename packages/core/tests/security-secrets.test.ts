import { describe, expect, it } from 'vitest'
import { isSensitiveFieldName, redactDeep, redactSecrets } from '../src/security/secrets'

describe('secret redaction', () => {
  it('redacts common provider tokens, bearer values, and PEM private keys', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nprivate-material\n-----END PRIVATE KEY-----'
    const value = 'xoxb-123456789012 x sk-proj-1234567890123456 sk-ant-1234567890123456 AKIA1234567890ABCDEF ghp_1234567890abcdef Bearer abcdefghijklmnop ' + pem
    const result = redactSecrets(value)
    expect(result).not.toContain('xoxb-')
    expect(result).not.toContain('sk-proj-')
    expect(result).not.toContain('sk-ant-')
    expect(result).not.toContain('AKIA')
    expect(result).not.toContain('ghp_')
    expect(result).not.toContain('Bearer abc')
    expect(result).toContain('Bearer [REDACTED]')
    expect(result).not.toContain('private-material')
  })

  it('redacts explicit credentials and values assigned to sensitive keys', () => {
    expect(redactSecrets('credential=super-secret api_key: abcdef', ['super-secret']))
      .toBe('credential=[REDACTED] api_key: [REDACTED]')
  })

  it('preserves sensitive JSON shape and covers bot paths and signatures', () => {
    const input = '{"access_token":"secret with spaces","signature":"signed value"} /botbot-secret'
    const result = redactSecrets(input)
    expect(result).toBe('{"access_token":"[REDACTED]","signature":"[REDACTED]"} /bot[REDACTED]')
  })

  it('redacts short provider CLI credentials while preserving the Bearer scheme', () => {
    expect(redactSecrets('Bearer short sk-bail-test xai1234567890 AIza1234567890'))
      .toBe('Bearer [REDACTED] [REDACTED] [REDACTED] [REDACTED]')
  })

  it('redacts nested secret fields and string values and safely handles cycles', () => {
    const value: Record<string, unknown> = {
      clientSecret: 'plain-secret',
      nested: { message: 'Bearer abcdefghijklmnop' },
    }
    value.self = value
    expect(redactDeep(value)).toEqual({
      clientSecret: '[REDACTED]',
      nested: { message: 'Bearer [REDACTED]' },
      self: '[Circular]',
    })
  })

  it('recognizes sensitive field names across common casing styles', () => {
    expect(isSensitiveFieldName('clientSecret')).toBe(true)
    expect(isSensitiveFieldName('api_key')).toBe(true)
    expect(isSensitiveFieldName('apiKeyEnv')).toBe(false)
    expect(isSensitiveFieldName('displayName')).toBe(false)
  })

  it('bounds recursion depth', () => {
    let current: Record<string, unknown> = {}
    const root = current
    for (let depth = 0; depth < 20; depth++) {
      const next: Record<string, unknown> = {}
      current.next = next
      current = next
    }
    current.value = true
    let nested = redactDeep(root) as Record<string, unknown>
    for (let depth = 0; depth < 19; depth++) nested = nested.next as Record<string, unknown>
    expect(nested.next).toBe('[MaxDepth]')
  })
})
