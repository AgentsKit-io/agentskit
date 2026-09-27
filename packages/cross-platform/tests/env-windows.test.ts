import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/runtime', () => ({ isWindows: true }))

const { getEnv, safeEnv } = await import('../src/env')

describe('env on Windows', () => {
  it('reads variables case-insensitively', () => {
    expect(getEnv('PATH', { Path: 'C:\\bin' })).toBe('C:\\bin')
    expect(getEnv('comspec', { ComSpec: 'cmd.exe' })).toBe('cmd.exe')
    expect(getEnv('MISSING', { Path: 'x' })).toBeUndefined()
  })

  it('keeps one entry per variable, in the parent spelling', () => {
    const env = safeEnv({ source: { Path: 'C:\\bin', ComSpec: 'C:\\cmd.exe', SECRET: 'x' } })
    expect(env).toEqual({ Path: 'C:\\bin', ComSpec: 'C:\\cmd.exe' })
  })

  it('lets extras replace or remove a variable whatever its case', () => {
    const source = { Path: 'C:\\bin', TEMP: 'C:\\tmp' }
    expect(safeEnv({ source, extra: { PATH: 'C:\\other' } })).toEqual({ PATH: 'C:\\other', TEMP: 'C:\\tmp' })
    expect(safeEnv({ source, extra: { path: undefined } })).toEqual({ TEMP: 'C:\\tmp' })
  })
})
