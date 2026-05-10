import { describe, expect, it, vi } from 'vitest'
import {
  createValidatorGuard,
  denyPattern,
  isJson,
  lengthRange,
} from '../src/validator-guard'

describe('createValidatorGuard', () => {
  it('passes through when every validator accepts', async () => {
    const guard = createValidatorGuard({
      validators: [{ name: 'always-ok', check: () => true }],
    })
    const result = await guard.run({ regenerate: async () => 'hello' })
    expect(result).toMatchObject({ output: 'hello', accepted: true, attempts: 1, failures: [] })
  })

  it('blocks when a validator with onFail=block fails', async () => {
    const guard = createValidatorGuard({
      validators: [denyPattern(/secret/, 'no-secret')],
    })
    const result = await guard.run({ regenerate: async () => 'this is a secret' })
    expect(result.accepted).toBe(false)
    expect(result.output).toBe('')
    expect(result.failures[0]!.action).toBe('block')
  })

  it('retries with the repair prompt and accepts on second try', async () => {
    const regen = vi
      .fn<(repair?: string) => Promise<string>>()
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce('{"ok":true}')
    const guard = createValidatorGuard({
      validators: [isJson({ maxRetries: 2 })],
    })
    const result = await guard.run({ regenerate: regen })
    expect(result.accepted).toBe(true)
    expect(result.attempts).toBe(2)
    expect(regen.mock.calls[1]![0]).toContain('valid JSON')
  })

  it('falls back when retries exhausted and a fallback is set', async () => {
    const guard = createValidatorGuard({
      validators: [isJson({ maxRetries: 1 })],
      fallback: 'I cannot answer that safely.',
    })
    const result = await guard.run({ regenerate: async () => 'still not json' })
    expect(result.accepted).toBe(false)
    expect(result.output).toBe('I cannot answer that safely.')
    expect(result.attempts).toBe(2)
  })

  it('emits audit events', async () => {
    const audit = vi.fn()
    const guard = createValidatorGuard({
      validators: [denyPattern(/leak/, 'no-leak')],
      audit,
    })
    await guard.run({ regenerate: async () => 'sensitive leak here' })
    expect(audit).toHaveBeenCalledOnce()
    expect(audit.mock.calls[0]![0].outcome).toBe('blocked')
  })

  it('chains multiple validators', async () => {
    const guard = createValidatorGuard({
      validators: [
        lengthRange({ max: 100, name: 'short' }),
        denyPattern(/badword/),
      ],
    })
    const ok = await guard.run({ regenerate: async () => 'fine and short' })
    expect(ok.accepted).toBe(true)
    const blocked = await guard.run({ regenerate: async () => 'this contains badword' })
    expect(blocked.accepted).toBe(false)
  })

  it('uses the seed and skips first regenerate', async () => {
    const regen = vi.fn(async () => 'fresh')
    const guard = createValidatorGuard({
      validators: [{ name: 'ok', check: () => true }],
    })
    const result = await guard.run({ regenerate: regen, seed: 'seeded' })
    expect(result.output).toBe('seeded')
    expect(regen).not.toHaveBeenCalled()
  })
})
