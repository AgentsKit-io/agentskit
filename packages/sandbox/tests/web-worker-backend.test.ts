import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webWorkerBackend, runStreaming } from './web-worker-backend'

/**
 * The web backend depends on browser globals (Worker / Blob /
 * URL.createObjectURL) that do not exist in the default `node` vitest
 * environment. We install a fake Worker that, on receiving `{ code }`, emits
 * stdout/stderr chunks and a `done` message — modelling the real worker
 * runner's protocol without spawning a real thread.
 */

type Outbound =
  | { type: 'chunk'; stream: 'stdout' | 'stderr'; data: string }
  | { type: 'done'; exitCode: number; stderr: string }

interface FakeBehavior {
  /** Chunks to emit before `done`. */
  chunks?: Outbound[]
  /** Exit code reported in the `done` message. Default 0. */
  exitCode?: number
  /** When true, never reply (simulates a hang → host timeout). */
  hang?: boolean
  /** When set, fire `onerror` with this message instead of replying. */
  error?: string
}

let behavior: FakeBehavior = {}
const terminate = vi.fn()
const revokeObjectURL = vi.fn()
const createObjectURL = vi.fn(() => 'blob:fake-url')

class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: ((event: { message?: string }) => void) | null = null
  terminate = terminate

  postMessage(_message: unknown): void {
    if (behavior.hang) return
    queueMicrotask(() => {
      if (behavior.error) {
        this.onerror?.({ message: behavior.error })
        return
      }
      for (const chunk of behavior.chunks ?? []) {
        this.onmessage?.({ data: chunk })
      }
      this.onmessage?.({
        data: { type: 'done', exitCode: behavior.exitCode ?? 0, stderr: '' },
      })
    })
  }
}

class FakeBlob {}

beforeEach(() => {
  behavior = {}
  terminate.mockClear()
  revokeObjectURL.mockClear()
  createObjectURL.mockClear()
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('Blob', FakeBlob)
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('webWorkerBackend', () => {
  it('returns stdout for a simple program', async () => {
    behavior = {
      chunks: [{ type: 'chunk', stream: 'stdout', data: 'hello\n' }],
      exitCode: 0,
    }
    const backend = webWorkerBackend()
    const result = await backend.execute('console.log("hello")', {})
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('hello')
    expect(result.stderr).toBe('')
    expect(typeof result.durationMs).toBe('number')
  })

  it('captures stderr chunks and non-zero exit codes', async () => {
    behavior = {
      chunks: [{ type: 'chunk', stream: 'stderr', data: 'boom\n' }],
      exitCode: 1,
    }
    const backend = webWorkerBackend()
    const result = await backend.execute('throw new Error("boom")', {})
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('boom')
  })

  it('respects the timeout and returns exitCode 1 with a timeout message', async () => {
    vi.useFakeTimers()
    behavior = { hang: true }
    const backend = webWorkerBackend()
    const promise = backend.execute('while(true){}', { timeout: 50 })
    await vi.advanceTimersByTimeAsync(60)
    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/timed out after 50ms/)
    expect(terminate).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('surfaces worker onerror as stderr + exitCode 1', async () => {
    behavior = { error: 'SyntaxError: bad' }
    const backend = webWorkerBackend()
    const result = await backend.execute('::::', {})
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/SyntaxError: bad/)
  })

  it('rejects python with a clear error result', async () => {
    const backend = webWorkerBackend()
    const result = await backend.execute('print(1)', { language: 'python' })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/only supports JavaScript/)
  })

  it('terminates the worker and revokes the object URL after success', async () => {
    behavior = { chunks: [], exitCode: 0 }
    const backend = webWorkerBackend()
    await backend.execute('1+1', {})
    expect(terminate).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
  })

  it('dispose resolves (no persistent worker held)', async () => {
    const backend = webWorkerBackend()
    await expect(backend.dispose?.()).resolves.toBeUndefined()
  })

  it('throws a SandboxError in a non-browser environment', async () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('Worker', undefined)
    vi.stubGlobal('Blob', undefined)
    vi.stubGlobal('URL', undefined)
    const backend = webWorkerBackend()
    await expect(backend.execute('1+1', {})).rejects.toThrow(
      /requires a browser environment/,
    )
  })
})

describe('runStreaming', () => {
  it('invokes onChunk for each chunk and resolves with the final result', async () => {
    behavior = {
      chunks: [
        { type: 'chunk', stream: 'stdout', data: 'a\n' },
        { type: 'chunk', stream: 'stdout', data: 'b\n' },
      ],
      exitCode: 0,
    }
    const chunks: string[] = []
    const result = await runStreaming('console.log("a");console.log("b")', (c) => {
      chunks.push(c.data)
    })
    expect(chunks).toEqual(['a\n', 'b\n'])
    expect(result.stdout).toBe('a\nb')
    expect(result.exitCode).toBe(0)
  })

  it('honors the timeout', async () => {
    vi.useFakeTimers()
    behavior = { hang: true }
    const promise = runStreaming('while(true){}', () => undefined, {
      timeout: 25,
    })
    await vi.advanceTimersByTimeAsync(30)
    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/timed out after 25ms/)
    vi.useRealTimers()
  })
})
