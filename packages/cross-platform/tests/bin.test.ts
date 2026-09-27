import { afterEach, describe, expect, it, vi } from 'vitest'

const runCli = vi.fn()
vi.mock('../src/lint/cli', () => ({ runCli }))

afterEach(() => {
  process.exitCode = undefined
  vi.resetModules()
})

describe('bin', () => {
  it('forwards argv and sets the exit code', async () => {
    runCli.mockResolvedValueOnce(3)
    await import('../src/bin')
    await vi.waitFor(() => expect(process.exitCode).toBe(3))
    expect(runCli).toHaveBeenCalledWith(process.argv.slice(2), expect.objectContaining({ cwd: process.cwd() }))
    process.exitCode = undefined
  })

  it('reports unexpected errors', async () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    runCli.mockRejectedValueOnce(new Error('boom'))
    await import('../src/bin')
    await vi.waitFor(() => expect(process.exitCode).toBe(1))
    expect(write).toHaveBeenCalledWith('boom\n')
    write.mockRestore()
    process.exitCode = undefined
  })
})
