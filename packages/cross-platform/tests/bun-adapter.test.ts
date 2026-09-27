import { describe, expect, it, vi } from 'vitest'
import { createBunAdapter, type BunRuntime, type BunSubprocess } from '../src/process/bun-adapter'

function stream(text: string): ReadableStream<Uint8Array> {
  return new Response(text).body!
}

const request = {
  command: 'tool',
  args: ['--flag'],
  cwd: '/work',
  env: { PATH: '/bin' },
  stdin: 'pipe' as const,
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
  windowsHide: true,
  windowsVerbatimArguments: true,
}

describe('createBunAdapter', () => {
  it('maps Bun.spawn to the adapter contract', async () => {
    const sink = { write: vi.fn(() => 1), flush: vi.fn(() => 1), end: vi.fn(async () => 1) }
    const proc: BunSubprocess = {
      pid: 42,
      stdin: sink,
      stdout: stream('out'),
      stderr: stream('err'),
      exited: Promise.resolve(0),
      exitCode: 0,
      signalCode: null,
      kill: vi.fn(),
    }
    const bun: BunRuntime = { spawn: vi.fn(() => proc) }
    const child = createBunAdapter(bun)(request)

    expect(bun.spawn).toHaveBeenCalledWith(['tool', '--flag'], expect.objectContaining({ cwd: '/work', windowsVerbatimArguments: true }))
    expect(child.pid).toBe(42)
    expect(await new Response(child.stdout).text()).toBe('out')
    expect(await new Response(child.stderr).text()).toBe('err')
    const writer = child.stdin!.getWriter()
    await writer.write(new Uint8Array([1]))
    await writer.close()
    expect(sink.write).toHaveBeenCalled()
    expect(sink.end).toHaveBeenCalled()
    expect(await child.exited).toEqual({ code: 0, signal: null })
    child.kill('SIGTERM')
    expect(proc.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('reports signals and missing streams', async () => {
    const proc: BunSubprocess = {
      pid: 1,
      stdin: undefined,
      stdout: 1,
      stderr: null,
      exited: Promise.resolve(143),
      exitCode: null,
      signalCode: 'SIGTERM',
      kill: vi.fn(),
    }
    const child = createBunAdapter({ spawn: () => proc })({ ...request, stdin: 'ignore', stdout: 'inherit', stderr: 'ignore' })
    expect(child.stdin).toBeNull()
    expect(child.stdout).toBeNull()
    expect(child.stderr).toBeNull()
    expect(await child.exited).toEqual({ code: null, signal: 'SIGTERM' })
  })
})
