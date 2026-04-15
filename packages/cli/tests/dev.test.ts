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
  trigger(event: string, path: string) {
    this.handlers[event]?.(path)
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

function createTempEntry(content = 'console.log("hello")\n'): string {
  const dir = mkdtempSync(join(tmpdir(), 'agentskit-dev-'))
  tmpFiles.push(dir)
  const path = join(dir, 'entry.ts')
  writeFileSync(path, content)
  return path
}

describe('startDev', () => {
  it('throws when entry file does not exist', () => {
    expect(() => startDev({ entry: '/nonexistent/file.ts' })).toThrow(/not found/)
  })

  it('spawns the entry on start', () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()
    const spawnSpy = vi.fn().mockReturnValue(new FakeChild())

    const controller = startDev({
      entry,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spawn: spawnSpy as any,
      watcher: () => watcher,
      stdout: { write: () => true } as NodeJS.WritableStream,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    expect(spawnSpy).toHaveBeenCalledTimes(1)
    expect(spawnSpy).toHaveBeenCalledWith('tsx', [entry])
    expect(controller.restarts()).toBe(1)
    void controller.stop()
  })

  it('restarts on file change with debounce', async () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()
    const spawnSpy = vi.fn().mockImplementation(() => new FakeChild())

    const controller = startDev({
      entry,
      debounceMs: 10,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spawn: spawnSpy as any,
      watcher: () => watcher,
      stdout: { write: () => true } as NodeJS.WritableStream,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    expect(spawnSpy).toHaveBeenCalledTimes(1)

    watcher.trigger('change', 'src/app.ts')
    await new Promise(r => setTimeout(r, 150))

    expect(spawnSpy).toHaveBeenCalledTimes(2)
    expect(controller.restarts()).toBe(2)

    await controller.stop()
  })

  it('coalesces rapid changes into a single restart', async () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()
    const spawnSpy = vi.fn().mockImplementation(() => new FakeChild())

    const controller = startDev({
      entry,
      debounceMs: 50,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spawn: spawnSpy as any,
      watcher: () => watcher,
      stdout: { write: () => true } as NodeJS.WritableStream,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    watcher.trigger('change', 'a.ts')
    watcher.trigger('change', 'b.ts')
    watcher.trigger('change', 'c.ts')
    await new Promise(r => setTimeout(r, 200))

    // 1 initial + 1 coalesced restart = 2
    expect(spawnSpy).toHaveBeenCalledTimes(2)
    await controller.stop()
  })

  it('passes scriptArgs through to the entry', () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()
    const spawnSpy = vi.fn().mockReturnValue(new FakeChild())

    const controller = startDev({
      entry,
      scriptArgs: ['--task', 'hello world'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spawn: spawnSpy as any,
      watcher: () => watcher,
      stdout: { write: () => true } as NodeJS.WritableStream,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    expect(spawnSpy).toHaveBeenCalledWith('tsx', [entry, '--task', 'hello world'])
    void controller.stop()
  })

  it('uses node for .js entries', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agentskit-dev-'))
    tmpFiles.push(dir)
    const entry = join(dir, 'entry.js')
    writeFileSync(entry, '')

    const watcher = new FakeWatcher()
    const spawnSpy = vi.fn().mockReturnValue(new FakeChild())

    const controller = startDev({
      entry,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spawn: spawnSpy as any,
      watcher: () => watcher,
      stdout: { write: () => true } as NodeJS.WritableStream,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    expect(spawnSpy).toHaveBeenCalledWith('node', [entry])
    void controller.stop()
  })

  it('stop() resolves done', async () => {
    const entry = createTempEntry()
    const watcher = new FakeWatcher()
    const spawnSpy = vi.fn().mockReturnValue(new FakeChild())

    const controller = startDev({
      entry,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spawn: spawnSpy as any,
      watcher: () => watcher,
      stdout: { write: () => true } as NodeJS.WritableStream,
      stderr: { write: () => true } as NodeJS.WritableStream,
    })

    void controller.stop()
    await expect(controller.done).resolves.toBeUndefined()
  })
})
