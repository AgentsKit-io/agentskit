import { spawn } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import { killProcessTree } from '../src/process/kill'

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('killProcessTree', () => {
  it('kills a parent and its grandchild', async () => {
    const parent = spawn(process.execPath, [
      '-e',
      'const c=require("child_process").spawn(process.execPath,["-e","setInterval(()=>{},1000)"]);console.log(c.pid);setInterval(()=>{},1000)',
    ])
    const grandchild = await new Promise<number>(resolve => parent.stdout.once('data', chunk => resolve(Number(String(chunk).trim()))))
    const closed = new Promise(resolve => parent.once('close', resolve))
    await killProcessTree(parent.pid!, 'SIGKILL')
    await closed
    await vi.waitFor(() => expect(alive(grandchild)).toBe(false), { timeout: 5000 })
  })

  it('does not reject for a process that already exited', async () => {
    const child = spawn(process.execPath, ['-e', ''])
    await new Promise(resolve => child.once('close', resolve))
    const fallback = vi.fn(() => {
      throw new Error('gone')
    })
    await expect(killProcessTree(child.pid!, 'SIGTERM', fallback)).resolves.toBeUndefined()
  })
})
