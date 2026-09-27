import { describe, expect, it } from 'vitest'
import { nodeAdapter } from '../src/process/node-adapter'

const base = {
  cwd: undefined,
  env: { ...process.env } as Record<string, string>,
  stdin: 'pipe' as const,
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
  windowsHide: true,
  windowsVerbatimArguments: false,
}

describe('nodeAdapter', () => {
  it('spawns with web streams', async () => {
    const child = nodeAdapter({ ...base, command: process.execPath, args: ['-e', 'process.stdout.write("ok")'] })
    expect(await new Response(child.stdout).text()).toBe('ok')
    expect(await child.exited).toEqual({ code: 0, signal: null })
  })

  it('rejects exited when the binary is missing', async () => {
    const child = nodeAdapter({ ...base, command: 'definitely-missing-xyz', args: [] })
    await expect(child.exited).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('signals the process', async () => {
    const child = nodeAdapter({ ...base, command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'], stdin: 'ignore' })
    expect(child.stdin).toBeNull()
    child.kill('SIGKILL')
    expect((await child.exited).code).not.toBe(0)
  })
})
