import { describe, expect, it, vi } from 'vitest'
import { createDenoAdapter, type DenoCommandOptions, type DenoRuntime } from '../src/process/deno-adapter'

const request = {
  command: 'tool',
  args: ['a'],
  cwd: undefined,
  env: { PATH: '/bin' },
  stdin: 'pipe' as const,
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
  windowsHide: true,
  windowsVerbatimArguments: false,
}

function fakeDeno(status: { code: number; signal: string | null }) {
  const calls: Array<{ command: string; options: DenoCommandOptions }> = []
  const kill = vi.fn()
  const stdinGetter = vi.fn(() => new WritableStream<Uint8Array>())
  const deno: DenoRuntime = {
    Command: class {
      constructor(command: string, options: DenoCommandOptions) {
        calls.push({ command, options })
      }
      spawn() {
        return {
          pid: 7,
          get stdin() {
            return stdinGetter()
          },
          get stdout() {
            return new Response('out').body!
          },
          get stderr() {
            return new Response('err').body!
          },
          status: Promise.resolve(status),
          kill,
        }
      }
    },
  }
  return { deno, calls, kill, stdinGetter }
}

describe('createDenoAdapter', () => {
  it('maps Deno.Command to the adapter contract', async () => {
    const { deno, calls, kill } = fakeDeno({ code: 0, signal: null })
    const child = createDenoAdapter(deno)(request)
    expect(calls[0]).toEqual({
      command: 'tool',
      options: expect.objectContaining({ args: ['a'], clearEnv: true, stdin: 'piped', stdout: 'piped', windowsRawArguments: false }),
    })
    expect(child.pid).toBe(7)
    expect(child.stdin).toBeInstanceOf(WritableStream)
    expect(await new Response(child.stdout).text()).toBe('out')
    expect(await child.exited).toEqual({ code: 0, signal: null })
    child.kill('SIGKILL')
    expect(kill).toHaveBeenCalledWith('SIGKILL')
  })

  it('never touches non-piped stream getters (Deno throws on them)', async () => {
    const { deno, calls, stdinGetter } = fakeDeno({ code: 143, signal: 'SIGTERM' })
    const child = createDenoAdapter(deno)({ ...request, stdin: 'inherit', stdout: 'ignore', stderr: 'ignore' })
    expect(stdinGetter).not.toHaveBeenCalled()
    expect(child.stdin).toBeNull()
    expect(child.stdout).toBeNull()
    expect(calls[0]?.options).toMatchObject({ stdin: 'inherit', stdout: 'null', stderr: 'null' })
    expect(await child.exited).toEqual({ code: null, signal: 'SIGTERM' })
  })
})
