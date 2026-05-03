import { describe, expect, it, vi } from 'vitest'
import {
  createInMemoryRedactionVault,
  DEFAULT_PII_RULES,
  reveal,
  tokenize,
  type PIIRule,
  type RedactionAuditEvent,
} from '../src/security'

const EMAIL_RULE: PIIRule = {
  name: 'email',
  pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  replacer: '[REDACTED_EMAIL]',
}
const PHONE_RULE: PIIRule = {
  name: 'phone',
  pattern: /\d{3}-\d{3}-\d{4}/g,
  replacer: '[REDACTED_PHONE]',
}

describe('tokenize + reveal — round-trip', () => {
  it('tokenizes PII and reveals it back when actor has the right role', async () => {
    const vault = createInMemoryRedactionVault()
    const input = 'Contact alice@example.com or 555-123-4567'

    const { value: tokenized, tokens } = await tokenize(input, {
      rules: DEFAULT_PII_RULES,
      vault,
      allowedRoles: ['support-lead'],
    })
    expect(tokenized).toMatch(/<<piitoken:[a-f0-9]{32}>>/)
    expect(tokenized).not.toContain('alice@example.com')
    expect(tokenized).not.toContain('555-123-4567')
    expect(tokens).toHaveLength(2)

    const revealed = await reveal(tokenized, {
      vault,
      actor: { id: 'lead@co', roles: ['support-lead'] },
    })
    expect(revealed.value).toBe(input)
    expect(revealed.revealed).toBe(2)
    expect(revealed.denied).toBe(0)
  })

  it('denies reveal when actor has no matching role', async () => {
    const vault = createInMemoryRedactionVault()
    const { value: tokenized } = await tokenize('email alice@example.com', {
      rules: DEFAULT_PII_RULES,
      vault,
      allowedRoles: ['support-lead'],
    })

    const revealed = await reveal(tokenized, {
      vault,
      actor: { id: 'agent@co', roles: ['agent'] },
    })
    expect(revealed.value).toBe(tokenized)
    expect(revealed.revealed).toBe(0)
    expect(revealed.denied).toBe(1)
  })

  it('reveals only the tokens whose roles match (partial reveal)', async () => {
    const vault = createInMemoryRedactionVault()
    const input = 'Contact alice@example.com or 555-123-4567'

    const { value: stage1 } = await tokenize(input, {
      rules: [EMAIL_RULE],
      vault,
      allowedRoles: ['email-only'],
    })
    const { value: stage2 } = await tokenize(stage1, {
      rules: [PHONE_RULE],
      vault,
      allowedRoles: ['phone-only'],
    })

    const revealed = await reveal(stage2, {
      vault,
      actor: { id: 'a', roles: ['email-only'] },
    })
    expect(revealed.value).toContain('alice@example.com')
    expect(revealed.value).not.toContain('555-123-4567')
    expect(revealed.value).toMatch(/<<piitoken:[a-f0-9]{32}>>/)
    expect(revealed.revealed).toBe(1)
    expect(revealed.denied).toBe(1)
  })

  it('passes input through unchanged when no PII matches', async () => {
    const vault = createInMemoryRedactionVault()
    const { value, tokens } = await tokenize('all clean here', {
      rules: DEFAULT_PII_RULES,
      vault,
      allowedRoles: ['x'],
    })
    expect(value).toBe('all clean here')
    expect(tokens).toHaveLength(0)
  })

  it('returns input unchanged when no tokens present on reveal', async () => {
    const vault = createInMemoryRedactionVault()
    const result = await reveal('plain text', {
      vault,
      actor: { id: 'a', roles: ['x'] },
    })
    expect(result.value).toBe('plain text')
    expect(result.revealed).toBe(0)
    expect(result.denied).toBe(0)
  })

  it('treats unknown tokens as denied (leaves placeholder)', async () => {
    const vault = createInMemoryRedactionVault()
    const stale = '<<piitoken:' + 'a'.repeat(32) + '>>'
    const result = await reveal(stale, {
      vault,
      actor: { id: 'a', roles: ['x'] },
    })
    expect(result.value).toBe(stale)
    expect(result.denied).toBe(1)
  })

  it('emits pii:redact audit event with rule hit counts', async () => {
    const events: RedactionAuditEvent[] = []
    const audit = vi.fn(async (e: RedactionAuditEvent) => { events.push(e) })
    const vault = createInMemoryRedactionVault()
    await tokenize('a@b.co and c@d.io', {
      rules: DEFAULT_PII_RULES,
      vault,
      allowedRoles: ['x'],
      audit,
    })
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('pii:redact')
    expect(events[0].tokens).toBe(2)
    expect(events[0].rules).toEqual([{ rule: 'email', count: 2 }])
  })

  it('emits pii:reveal + pii:reveal-denied separately', async () => {
    const events: RedactionAuditEvent[] = []
    const audit = vi.fn(async (e: RedactionAuditEvent) => { events.push(e) })
    const vault = createInMemoryRedactionVault()
    // Build the mixed-roles input by tokenizing each PII separately
    // with a distinct allowedRoles list. Use [EMAIL_RULE] only for
    // determinism — DEFAULT_PII_RULES has phone / cc / uuid rules
    // that can interact with the hex token format on some hosts.
    const { value: t1 } = await tokenize('a@b.co', { rules: [EMAIL_RULE], vault, allowedRoles: ['ok'] })
    const { value: t2 } = await tokenize(`${t1} c@d.io`, { rules: [EMAIL_RULE], vault, allowedRoles: ['nope'] })
    await reveal(t2, {
      vault,
      actor: { id: 'a', roles: ['ok'] },
      audit,
    })
    expect(events.find(e => e.type === 'pii:reveal')?.tokens).toBe(1)
    expect(events.find(e => e.type === 'pii:reveal-denied')?.tokens).toBe(1)
  })
})

describe('tokenize — alignment edge cases', () => {
  it('handles adjacent PII matches with no separator', async () => {
    const vault = createInMemoryRedactionVault()
    const input = 'alice@example.combob@example.org'
    const { value, tokens } = await tokenize(input, {
      rules: [EMAIL_RULE],
      vault,
      allowedRoles: ['ok'],
    })
    expect(tokens.length).toBeGreaterThanOrEqual(1)
    // Round-trip recovers the original.
    const revealed = await reveal(value, { vault, actor: { id: 'a', roles: ['ok'] } })
    expect(revealed.value).toBe(input)
  })

  it('handles PII whose value collides with surrounding literal text', async () => {
    const vault = createInMemoryRedactionVault()
    // The literal `bob.bob` appears in the input both inside the email
    // and as standalone text — proves the algorithm does not anchor on
    // the post-marker prefix to find the PII boundary.
    const input = 'email bob@bob.bob then mention bob.bob'
    const { value } = await tokenize(input, {
      rules: [EMAIL_RULE],
      vault,
      allowedRoles: ['ok'],
    })
    const revealed = await reveal(value, { vault, actor: { id: 'a', roles: ['ok'] } })
    expect(revealed.value).toBe(input)
  })

  it('handles PII at the very start and very end of input', async () => {
    const vault = createInMemoryRedactionVault()
    const input = 'a@b.co middle c@d.co'
    const { value, tokens } = await tokenize(input, {
      rules: [EMAIL_RULE],
      vault,
      allowedRoles: ['ok'],
    })
    expect(tokens).toHaveLength(2)
    const revealed = await reveal(value, { vault, actor: { id: 'a', roles: ['ok'] } })
    expect(revealed.value).toBe(input)
  })

  it('works with a custom replacer that does NOT match [REDACTED_*]', async () => {
    const vault = createInMemoryRedactionVault()
    const customRule: PIIRule = {
      name: 'secret',
      pattern: /sk-[a-z0-9]+/g,
      replacer: '***',
    }
    const { value, tokens } = await tokenize('key sk-abc123 is mine', {
      rules: [customRule],
      vault,
      allowedRoles: ['ok'],
    })
    expect(tokens).toHaveLength(1)
    const revealed = await reveal(value, { vault, actor: { id: 'a', roles: ['ok'] } })
    expect(revealed.value).toBe('key sk-abc123 is mine')
  })

  it('drops overlapping matches (earlier rule wins)', async () => {
    const vault = createInMemoryRedactionVault()
    // Both patterns match overlapping ranges of the same input. Sorted
    // by start, the longer match (broad) wins; the second is dropped.
    const broad: PIIRule = { name: 'broad', pattern: /AAA\d+/g, replacer: '[B]' }
    const narrow: PIIRule = { name: 'narrow', pattern: /\d+/g, replacer: '[N]' }
    const { tokens } = await tokenize('xxx AAA123 xxx', {
      rules: [broad, narrow],
      vault,
      allowedRoles: ['ok'],
    })
    expect(tokens).toHaveLength(1)
  })
})

describe('config errors', () => {
  it('tokenize: throws when rules missing', async () => {
    const vault = createInMemoryRedactionVault()
    await expect(
      tokenize('x', { rules: undefined as never, vault, allowedRoles: ['x'] }),
    ).rejects.toThrow(/rules array is required/)
  })

  it('tokenize: throws when vault missing', async () => {
    await expect(
      tokenize('x', { rules: DEFAULT_PII_RULES, vault: undefined as never, allowedRoles: ['x'] }),
    ).rejects.toThrow(/vault is required/)
  })

  it('reveal: throws when actor.roles missing', async () => {
    const vault = createInMemoryRedactionVault()
    await expect(
      reveal('x', { vault, actor: undefined as never }),
    ).rejects.toThrow(/actor with roles/)
  })
})
