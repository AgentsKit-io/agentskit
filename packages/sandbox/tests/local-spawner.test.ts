import { describe, expect, it } from 'vitest'
import { nodeSpawner } from '../src/index'

describe('nodeSpawner', () => {
  it('execs a command to completion capturing stdout + exit code', async () => {
    const spawner = await nodeSpawner()
    const res = await spawner.exec!({
      command: process.execPath,
      args: ['-e', 'process.stdout.write("hi")'],
    })
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toBe('hi')
    expect(res.timedOut).toBe(false)
  })

  it('reports a non-zero exit code', async () => {
    const spawner = await nodeSpawner()
    const res = await spawner.exec!({
      command: process.execPath,
      args: ['-e', 'process.exit(3)'],
    })
    expect(res.exitCode).toBe(3)
  })

  it('truncates combined stdout+stderr by total bytes (not chars / per stream)', async () => {
    const spawner = await nodeSpawner()
    const res = await spawner.exec!({
      command: process.execPath,
      args: [
        '-e',
        'process.stdout.write("x".repeat(60)); process.stderr.write("y".repeat(60))',
      ],
      maxOutputBytes: 50,
    })
    expect(res.truncated).toBe(true)
    const total = Buffer.byteLength(res.stdout, 'utf8') + Buffer.byteLength(res.stderr, 'utf8')
    expect(total).toBeLessThanOrEqual(50)
  })

  it('never returns an invalid UTF-8 suffix beyond the byte cap', async () => {
    const spawner = await nodeSpawner()
    const res = await spawner.exec!({
      command: process.execPath,
      args: ['-e', 'process.stdout.write("🙂🙂")'],
      maxOutputBytes: 5,
    })
    expect(res.truncated).toBe(true)
    expect(res.stdout).toBe('🙂')
    expect(Buffer.byteLength(res.stdout, 'utf8')).toBeLessThanOrEqual(5)
    expect(res.stdout).not.toContain('�')
  })

  it('reports timeout and kills the child', async () => {
    const spawner = await nodeSpawner()
    const res = await spawner.exec!({
      command: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 60_000)'],
      timeoutMs: 50,
    })
    expect(res.timedOut).toBe(true)
    // killed processes typically exit non-zero / -1
    expect(res.exitCode).not.toBe(0)
  })

  it('rejects invalid timeoutMs / maxOutputBytes', async () => {
    const spawner = await nodeSpawner()
    await expect(
      spawner.exec!({
        command: process.execPath,
        args: ['-e', '0'],
        timeoutMs: 0,
      }),
    ).rejects.toThrow(/timeoutMs/)
    await expect(
      spawner.exec!({
        command: process.execPath,
        args: ['-e', '0'],
        maxOutputBytes: -1,
      }),
    ).rejects.toThrow(/maxOutputBytes/)
  })

  it('rejects spawn of a missing command with SandboxError', async () => {
    const spawner = await nodeSpawner()
    await expect(
      spawner.exec!({
        command: '/definitely/missing/binary-agentskit-test',
        args: [],
      }),
    ).rejects.toThrow(/failed to exec/)
  })
})
