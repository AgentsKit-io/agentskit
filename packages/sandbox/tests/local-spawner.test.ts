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

  it('truncates output past maxOutputBytes', async () => {
    const spawner = await nodeSpawner()
    const res = await spawner.exec!({
      command: process.execPath,
      args: ['-e', 'process.stdout.write("x".repeat(1000))'],
      maxOutputBytes: 100,
    })
    expect(res.truncated).toBe(true)
    expect(res.stdout.length).toBeLessThanOrEqual(100)
  })
})
