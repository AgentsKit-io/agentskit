import { describe, expect, it } from 'vitest'
import { CrossPlatformErrorCodes } from '../src/errors'
import { runCommand } from '../src/process/run'

const node = process.execPath

describe('runCommand', () => {
  it('collects output and exit code', async () => {
    const result = await runCommand(node, ['-e', 'console.log("hi");console.error("oops");process.exit(3)'])
    expect(result.stdout.trim()).toBe('hi')
    expect(result.stderr.trim()).toBe('oops')
    expect(result.code).toBe(3)
    expect(result.timedOut).toBe(false)
    expect(result.truncated).toBe(false)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('decodes multi-byte characters split across chunks', async () => {
    const result = await runCommand(node, ['-e', 'process.stdout.write("ação ✓ ".repeat(20000))'])
    expect(result.stdout).toBe('ação ✓ '.repeat(20000))
  })

  it('truncates and stops at maxOutputBytes', async () => {
    const result = await runCommand(node, ['-e', 'setInterval(()=>process.stdout.write("x".repeat(1024)),1)'], {
      maxOutputBytes: 4096,
    })
    expect(result.truncated).toBe(true)
    expect(result.stdout.length).toBe(4096)
    expect(result.termination).toBe('killed')
  })

  it('flags timeouts', async () => {
    const result = await runCommand(node, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 200 })
    expect(result.timedOut).toBe(true)
  })

  it('rejects when the command cannot start', async () => {
    await expect(runCommand('definitely-missing-xyz')).rejects.toMatchObject({
      code: CrossPlatformErrorCodes.AK_PLATFORM_COMMAND_NOT_FOUND,
    })
  })

  it('validates maxOutputBytes', async () => {
    await expect(runCommand(node, [], { maxOutputBytes: 0 })).rejects.toMatchObject({
      code: CrossPlatformErrorCodes.AK_PLATFORM_INVALID_INPUT,
    })
  })
})
