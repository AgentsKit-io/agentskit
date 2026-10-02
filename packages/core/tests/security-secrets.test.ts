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

  it('covers the core redaction comparison fixtures', () => {
    const fixtures = [
      ['key=sk-proj-1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=sk-ant-api03-1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=pk-live-1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=ghp_1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=gho_1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=ghs_1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=ghr_1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=github_pat_1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=xoxb-1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=xoxp-1234567890abcdef1234567890', 'key=[REDACTED]'],
      ['key=AKIA1234567890ABCDEF', 'key=[REDACTED]'],
      ['Authorization: Bearer fakeToken1234567890', 'Authorization: [REDACTED]'],
      ['-----BEGIN PRIVATE KEY-----\nFAKEKEYDATA1234567890\n-----END PRIVATE KEY-----', '[REDACTED]'],
      ['api_key=fakeValue1234567890', 'api_key=[REDACTED]'],
      ['api_key="fakeValue1234567890"', 'api_key="[REDACTED]"'],
      ['secret: fakeValue1234567890', 'secret: [REDACTED]'],
      ["secret: 'fakeValue1234567890'", "secret: '[REDACTED]'"],
      ['token=fakeValue1234567890', 'token=[REDACTED]'],
      ['token="fakeValue1234567890"', 'token="[REDACTED]"'],
      ['password=fakeValue1234567890', 'password=[REDACTED]'],
      ["password='fakeValue1234567890'", "password='[REDACTED]'"],
      ['key=xai1234567890abcdef', 'key=[REDACTED]'],
      ['key=AIza1234567890abcdef', 'key=[REDACTED]'],
      ['key=ghp_1234567890', 'key=[REDACTED]'],
      ['key=ghp_1234567890abcdef gho_1234567890abcdef ghs_1234567890abcdef ghr_1234567890abcdef gho_1234567890abcdef', 'key=[REDACTED] [REDACTED] [REDACTED] [REDACTED] [REDACTED]'],
      ['request /botfakeBotToken1234567890/sendMessage', 'request /bot[REDACTED]/sendMessage'],
      ['access_token=fakeValue1234567890', 'access_token=[REDACTED]'],
      ['client_secret="fake"', 'client_secret="[REDACTED]"'],
      ['normal words only', 'normal words only'],
      ['id=abc123', 'id=abc123'],
      ['/Users/example/project/src/index.ts', '/Users/example/project/src/index.ts'],
      ['0123456789abcdef0123456789abcdef01234567', '0123456789abcdef0123456789abcdef01234567'],
      ['https://example.com/path?ref=main', 'https://example.com/path?ref=main'],
    ] as const

    for (const [input, expected] of fixtures) expect(redactSecrets(input)).toBe(expected)
  })

  it('leaves token vocabulary and token type labels alone', () => {
    const input = 'max_tokens=1000 tokens: 42 token_count=10 tokenizer=cl100k inputTokens: 12 totalTokens=99 tokenType=Bearer'
    expect(redactSecrets(input)).toBe(input)
    expect(isSensitiveFieldName('max_tokens')).toBe(false)
    expect(isSensitiveFieldName('tokens')).toBe(false)
    expect(isSensitiveFieldName('token_count')).toBe(false)
    expect(isSensitiveFieldName('tokenizer')).toBe(false)
    expect(isSensitiveFieldName('inputTokens')).toBe(false)
    expect(isSensitiveFieldName('totalTokens')).toBe(false)
    expect(isSensitiveFieldName('tokenType')).toBe(false)
  })

  it('recognizes generic token fields as sensitive in nested values', () => {
    expect(isSensitiveFieldName('token')).toBe(true)
    expect(isSensitiveFieldName('sessionToken')).toBe(true)
    expect(isSensitiveFieldName('session-token')).toBe(true)
    expect(redactSecrets('{"token": "fakeValue1234567890"}')).toBe('{"token": "[REDACTED]"}')
    expect(redactDeep({ token: 'fakeValue1234567890', tokenType: 'Bearer', tokens: 42 })).toEqual({
      token: '[REDACTED]', tokenType: 'Bearer', tokens: 42,
    })
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
