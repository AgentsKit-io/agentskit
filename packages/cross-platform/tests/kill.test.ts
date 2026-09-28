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

  it.skipIf(process.platform === 'win32')('reaches group members whose parent already exited', async () => {
    // leader (detached) -> middle (exits) -> orphan: the tree walk from the leader no longer sees the orphan.
    const middle =
      'const o=require("child_process").spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});' +
      'o.unref();console.log(o.pid);process.exit(0)'
    const leader = spawn(
      process.execPath,
      ['-e', `const m=require("child_process").spawn(process.execPath,["-e",${JSON.stringify(middle)}]);m.stdout.pipe(process.stdout);setInterval(()=>{},1000)`],
      { detached: true },
    )
    const orphan = await new Promise<number>(resolve => leader.stdout.once('data', chunk => resolve(Number(String(chunk).trim()))))
    await new Promise(resolve => setTimeout(resolve, 300))
    const closed = new Promise(resolve => leader.once('close', resolve))
    await killProcessTree(leader.pid!, 'SIGKILL')
    await closed
    await vi.waitFor(() => expect(alive(orphan)).toBe(false), { timeout: 5000 })
  })
})
