import { homedir, tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { SYSTEM_ENV_KEYS, getEnv, homeDir, safeEnv, tempDir } from '../src/env'

describe('env', () => {
  it('keeps system variables and drops secrets', () => {
    const env = safeEnv({ source: { PATH: '/bin', SystemRoot: 'C:\\Windows', OPENAI_API_KEY: 'sk-secret' } })
    expect(env).toEqual({ PATH: '/bin', SystemRoot: 'C:\\Windows' })
  })

  it('inherits requested names and applies extras', () => {
    const env = safeEnv({
      source: { PATH: '/bin', CI: '1', DROP: 'x' },
      inherit: ['CI'],
      extra: { FOO: 'bar', PATH: undefined },
    })
    expect(env).toEqual({ CI: '1', FOO: 'bar' })
  })

  it('reads process.env by default', () => {
    expect(safeEnv().PATH ?? safeEnv().Path).toBeDefined()
    expect(getEnv('PATH') ?? getEnv('Path')).toBeDefined()
  })

  it('looks variables up case-insensitively only on Windows', () => {
    const source = { Path: 'C:\\bin' }
    expect(getEnv('PATH', source)).toBe(process.platform === 'win32' ? 'C:\\bin' : undefined)
    expect(getEnv('Path', source)).toBe('C:\\bin')
    expect(getEnv('MISSING', source)).toBeUndefined()
  })

  it('lists the Windows essentials', () => {
    for (const key of ['PATHEXT', 'SystemRoot', 'COMSPEC']) expect(SYSTEM_ENV_KEYS).toContain(key)
  })

  it('exposes home and temp directories from node:os', () => {
    expect(homeDir()).toBe(homedir())
    expect(tempDir()).toBe(tmpdir())
  })
})

describe('env under Deno without --allow-env', () => {
  it('raises a typed permission error', () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'env')!
    Object.defineProperty(process, 'env', {
      configurable: true,
      get() {
        throw Object.assign(new Error('Requires env access'), { name: 'NotCapable' })
      },
    })
    try {
      expect(() => safeEnv()).toThrow(expect.objectContaining({ code: 'AK_PLATFORM_PERMISSION_DENIED' }))
    } finally {
      Object.defineProperty(process, 'env', descriptor)
    }
  })
})
