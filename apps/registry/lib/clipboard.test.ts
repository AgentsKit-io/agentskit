import { describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

describe('copyText', () => {
  it('reports success only after the clipboard write succeeds', async () => {
    const fallbackCopy = vi.fn(() => false)
    await expect(copyText('command', { writeText: vi.fn().mockResolvedValue(undefined), fallbackCopy })).resolves.toBe(true)
    expect(fallbackCopy).not.toHaveBeenCalled()
  })

  it('uses the fallback result when the Clipboard API fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    await expect(copyText('command', { writeText, fallbackCopy: () => true })).resolves.toBe(true)
    await expect(copyText('command', { writeText, fallbackCopy: () => false })).resolves.toBe(false)
  })

  it('returns false when both clipboard paths fail', async () => {
    await expect(copyText('command', {
      writeText: vi.fn().mockRejectedValue(new Error('denied')),
      fallbackCopy: () => { throw new Error('blocked') },
    })).resolves.toBe(false)
  })
})
