import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/runtime', () => ({ isWindows: true }))
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    stat: vi.fn(async (path: string) => ({ isDirectory: () => path.endsWith('dir') })),
    symlink: vi.fn(),
    copyFile: vi.fn(async () => undefined),
    rm: vi.fn(async () => {
      throw Object.assign(new Error('denied'), { name: 'NotCapable' })
    }),
  }
})

const fsp = await import('node:fs/promises')
const { createSymlink, removePath, setFileMode } = await import('../src/fs')

const eperm = () => Object.assign(new Error('privilege'), { code: 'EPERM' })

afterEach(() => {
  vi.mocked(fsp.symlink).mockReset()
})

describe('fs on Windows without symlink privilege', () => {
  it('falls back to a junction for directories', async () => {
    vi.mocked(fsp.symlink).mockRejectedValueOnce(eperm()).mockResolvedValueOnce(undefined)
    expect(await createSymlink('C:\\target-dir', 'C:\\link')).toBe('junction')
    expect(fsp.symlink).toHaveBeenLastCalledWith('C:\\target-dir', 'C:\\link', 'junction')
  })

  it('falls back to a copy for files', async () => {
    vi.mocked(fsp.symlink).mockRejectedValueOnce(eperm())
    expect(await createSymlink('C:\\file.txt', 'C:\\link.txt')).toBe('copy')
    expect(fsp.copyFile).toHaveBeenCalledWith('C:\\file.txt', 'C:\\link.txt')
  })

  it('rethrows other errors', async () => {
    vi.mocked(fsp.symlink).mockRejectedValueOnce(Object.assign(new Error('exists'), { code: 'EEXIST' }))
    await expect(createSymlink('C:\\file.txt', 'C:\\link.txt')).rejects.toMatchObject({ code: 'EEXIST' })
  })

  it('treats mode bits as unsupported', async () => {
    expect(await setFileMode('C:\\x', 0o600)).toBe(false)
  })

  it('maps Deno permission failures to a typed error', async () => {
    await expect(removePath('C:\\x')).rejects.toMatchObject({ code: 'AK_PLATFORM_PERMISSION_DENIED' })
  })
})
