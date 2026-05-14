/**
 * Extended dev.ts tests — covers exit code 0/non-zero paths and
 * the plugin/loader uncovered branches.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startDev, type DevWatcher } from '../src/dev'

class FakeChild extends EventEmitter {
  killed = false
  exitCode: number | null = null
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  kill(_signal: string) {
    this.killed = true
    this.exitCode = 143
    setImmediate(() => this.emit('exit', null, 'SIGTERM'))
    return true
  }
}

class FakeWatcher implements DevWatcher {
  handlers: Record<string, (path: string) => void> = {}
  on(event: string, listener: (path: string) => void): this {
    this.handlers[event] = listener
    return this
  }
  async close() {}
}

const tmpFiles: string[] = []

afterEach(() => {
  for (const f of tmpFiles) {
    try { rmSync(f, { recursive: true, force: true }) } catch {}
  }
  tmpFiles.length = 0
  vi.restoreAllMocks()
})

function createTempEntry(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agentskit-dev-ext-'))
  tmpFiles.push(dir)
  const path = join(dir, 'entry.ts')
  writeFileSync(path, 'console.log("hello")\n')
  return path
}

describe('startDev — exit code handling', () => {
  it('logs clean exit (code 0) without crashing', async () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()

    // Create a child that exits with code 0
    class ZeroExitChild extends FakeChild {
      constructor() {
        super()
        setImmediate(() => {
          this.exitCode = 0
          this.emit('exit', 0, null)
        })
      }
    }

    const spawnSpy = vi.fn().mockReturnValue(new ZeroExitChild())
    const stdout = { write: vi.fn() } as unknown as NodeJS.WritableStream

    const controller = startDev({
      entry,
      spawn: spawnSpy as never,
      watcher: () => watcher,
      stdout,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    // Give time for exit event
    await new Promise(r => setTimeout(r, 100))
    // stdout should have been called with "exited cleanly"
    const written = (stdout.write as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0] as string).join('')
    expect(written).toContain('exited cleanly')
    await controller.stop()
  })

  it('logs non-zero exit code without crashing', async () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()

    class NonZeroExitChild extends FakeChild {
      constructor() {
        super()
        setImmediate(() => {
          this.exitCode = 1
          this.emit('exit', 1, null)
        })
      }
    }

    const spawnSpy = vi.fn().mockReturnValue(new NonZeroExitChild())
    const stdout = { write: vi.fn() } as unknown as NodeJS.WritableStream

    const controller = startDev({
      entry,
      spawn: spawnSpy as never,
      watcher: () => watcher,
      stdout,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    await new Promise(r => setTimeout(r, 100))
    const written = (stdout.write as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0] as string).join('')
    expect(written).toContain('exited with code 1')
    await controller.stop()
  })

  it('does not log when exit is from SIGTERM (expected stop)', async () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()

    class SigtermChild extends FakeChild {
      constructor() {
        super()
        setImmediate(() => {
          this.emit('exit', null, 'SIGTERM')
        })
      }
    }

    const spawnSpy = vi.fn().mockReturnValue(new SigtermChild())
    const stdout = { write: vi.fn() } as unknown as NodeJS.WritableStream

    const controller = startDev({
      entry,
      spawn: spawnSpy as never,
      watcher: () => watcher,
      stdout,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    await new Promise(r => setTimeout(r, 100))
    const written = (stdout.write as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0] as string).join('')
    expect(written).not.toContain('exited cleanly')
    expect(written).not.toContain('exited with code')
    await controller.stop()
  })

  it('proxies child stdout/stderr to provided streams', async () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()
    const fakeChild = new FakeChild()
    const spawnSpy = vi.fn().mockReturnValue(fakeChild)
    const stdoutWrite = vi.fn()
    const stderrWrite = vi.fn()

    const controller = startDev({
      entry,
      spawn: spawnSpy as never,
      watcher: () => watcher,
      stdout: { write: stdoutWrite } as unknown as NodeJS.WritableStream,
      stderr: { write: stderrWrite } as unknown as NodeJS.WritableStream,
    })

    fakeChild.stdout.emit('data', Buffer.from('hello stdout\n'))
    fakeChild.stderr.emit('data', Buffer.from('hello stderr\n'))

    expect(stdoutWrite).toHaveBeenCalledWith(expect.any(Buffer))
    expect(stderrWrite).toHaveBeenCalledWith(expect.any(Buffer))

    await controller.stop()
  })
})
