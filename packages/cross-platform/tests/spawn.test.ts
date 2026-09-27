import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CrossPlatformErrorCodes } from '../src/errors'
import { selectAdapter, spawnProcess } from '../src/process/spawn'
import { nodeAdapter } from '../src/process/node-adapter'

const node = process.execPath

async function text(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return ''
  return new Response(stream).text()
}

describe('spawnProcess', () => {
  it('streams stdout and stderr as web streams', async () => {
    const child = spawnProcess(node, ['-e', 'process.stdout.write("out");process.stderr.write("err")'])
    const [out, err, status] = await Promise.all([text(child.stdout), text(child.stderr), child.exited])
    expect(out).toBe('out')
    expect(err).toBe('err')
    expect(status).toEqual({ code: 0, signal: null })
    expect(child.pid).toBeTypeOf('number')
  })

  it('delivers multi-line input through stdin intact', async () => {
    const prompt = 'line 1\nline 2 with "quotes" & ^carets\n'.repeat(2000)
    const child = spawnProcess(node, ['-e', 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(String(d.length)))'], {
      input: prompt,
    })
    expect(child.stdin).toBeNull()
    expect(await text(child.stdout)).toBe(String(prompt.length))
  })

  it('exposes stdin when no input is given', async () => {
    const child = spawnProcess(node, ['-e', 'process.stdin.pipe(process.stdout)'])
    const writer = child.stdin!.getWriter()
    await writer.write(new TextEncoder().encode('echo'))
    await writer.close()
    expect(await text(child.stdout)).toBe('echo')
  })

  it('passes cwd and env', async () => {
    const child = spawnProcess(node, ['-e', 'process.stdout.write(process.cwd()+"|"+process.env.AK_TEST)'], {
      cwd: dirname(fileURLToPath(import.meta.url)),
      env: { ...process.env, AK_TEST: 'yes', AK_UNDEFINED: undefined },
    })
    expect(await text(child.stdout)).toMatch(/tests\|yes$/)
  })

  it('kills the process tree on timeout', async () => {
    const script = 'require("child_process").spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"inherit"});setInterval(()=>{},1000)'
    const child = spawnProcess(node, ['-e', script], { timeoutMs: 300, killGraceMs: 500 })
    const status = await child.exited
    expect(status.termination).toBe('timeout')
    expect(status.code === null || status.code !== 0).toBe(true)
  })

  it('kills on abort, including an already-aborted signal', async () => {
    const controller = new AbortController()
    const child = spawnProcess(node, ['-e', 'setInterval(()=>{},1000)'], { signal: controller.signal })
    setTimeout(() => controller.abort(), 100)
    expect((await child.exited).termination).toBe('aborted')

    const early = spawnProcess(node, ['-e', 'setInterval(()=>{},1000)'], { signal: AbortSignal.abort() })
    expect((await early.exited).termination).toBe('aborted')
  })

  it('supports an explicit kill, and killing after exit is a no-op', async () => {
    const child = spawnProcess(node, ['-e', 'setInterval(()=>{},1000)'], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' })
    expect(child.stdout).toBeNull()
    await child.kill('SIGKILL')
    const status = await child.exited
    expect(status.termination).toBe('killed')
    await child.kill()
  })

  it('rejects exited with a typed error for a missing command', async () => {
    const child = spawnProcess('definitely-missing-xyz')
    await expect(child.exited).rejects.toMatchObject({ code: CrossPlatformErrorCodes.AK_PLATFORM_COMMAND_NOT_FOUND })
    expect(child.pid).toBeUndefined()
    await child.kill()
  })

  it('rejects invalid options synchronously', () => {
    const code = CrossPlatformErrorCodes.AK_PLATFORM_INVALID_INPUT
    expect(() => spawnProcess(' ')).toThrow(expect.objectContaining({ code }))
    expect(() => spawnProcess('a\0b')).toThrow(expect.objectContaining({ code }))
    expect(() => spawnProcess(node, ['x\0'])).toThrow(expect.objectContaining({ code }))
    expect(() => spawnProcess(node, [], { timeoutMs: 0 })).toThrow(expect.objectContaining({ code }))
    expect(() => spawnProcess(node, [], { killGraceMs: -1 })).toThrow(expect.objectContaining({ code }))
    expect(() => spawnProcess(node, [], { input: 'x', stdin: 'inherit' })).toThrow(expect.objectContaining({ code }))
  })
})

describe('selectAdapter', () => {
  it('uses node:child_process on Node', () => {
    expect(selectAdapter('node')).toBe(nodeAdapter)
    expect(selectAdapter('bun')).toBe(nodeAdapter)
    expect(selectAdapter('deno')).toBe(nodeAdapter)
  })

  it('uses the native API when the runtime global exists', () => {
    const globals = globalThis as { Bun?: unknown; Deno?: unknown }
    globals.Bun = { spawn: () => undefined }
    globals.Deno = { Command: class {} }
    try {
      expect(selectAdapter('bun')).not.toBe(nodeAdapter)
      expect(selectAdapter('deno')).not.toBe(nodeAdapter)
    } finally {
      delete globals.Bun
      delete globals.Deno
    }
  })

  it('refuses browsers and edge runtimes', () => {
    expect(() => selectAdapter('browser')).toThrow(
      expect.objectContaining({ code: CrossPlatformErrorCodes.AK_PLATFORM_UNSUPPORTED_RUNTIME }),
    )
  })
})
