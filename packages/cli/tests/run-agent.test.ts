/**
 * Tests for src/run.ts — the runAgent() function and its formatEvent helper.
 * We mock @agentskit/runtime so no real LLM calls happen.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import type { AgentEvent } from '@agentskit/core'

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// formatEvent internal helper — exercise by running agent with verbose flag
// ---------------------------------------------------------------------------

describe('runAgent', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('writes result content to stdout on success', async () => {
    vi.doMock('@agentskit/runtime', () => ({
      createRuntime: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ content: 'agent result', durationMs: 42 }),
      })),
    }))

    const { runAgent } = await import('../src/run')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await runAgent('do something', { provider: 'demo' })

    expect(stdoutSpy).toHaveBeenCalledWith('agent result\n')
  })

  it('rejects when skill and skills are both provided', async () => {
    vi.doMock('@agentskit/runtime', () => ({
      createRuntime: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ content: '', durationMs: 0 }),
      })),
    }))

    const { runAgent } = await import('../src/run')

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    await expect(
      runAgent('task', { provider: 'demo', skill: 'researcher', skills: 'coder,planner' }),
    ).rejects.toThrow('exit')

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('mutually exclusive'))
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('uses skills flag when provided', async () => {
    const mockRun = vi.fn().mockResolvedValue({ content: 'ok', durationMs: 0 })
    vi.doMock('@agentskit/runtime', () => ({
      createRuntime: vi.fn(() => ({ run: mockRun })),
    }))

    const { runAgent } = await import('../src/run')
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await runAgent('task', { provider: 'demo', skills: 'researcher' })
    expect(mockRun).toHaveBeenCalledOnce()
  })

  it('uses memory when memory option provided', async () => {
    const mockRun = vi.fn().mockResolvedValue({ content: 'ok', durationMs: 0 })
    vi.doMock('@agentskit/runtime', () => ({
      createRuntime: vi.fn(() => ({ run: mockRun })),
    }))

    const { runAgent } = await import('../src/run')
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await runAgent('task', { provider: 'demo', memory: '/tmp/test-memory.json' })
    expect(mockRun).toHaveBeenCalledOnce()
  })

  it('writes verbose observer events to stderr', async () => {
    let capturedObserver: { on: (e: AgentEvent) => void } | undefined

    vi.doMock('@agentskit/runtime', () => ({
      createRuntime: vi.fn((opts: { observers?: Array<{ on: (e: AgentEvent) => void }> }) => {
        capturedObserver = opts.observers?.[0]
        return {
          run: vi.fn().mockImplementation(async () => {
            // fire a few events via the observer
            if (capturedObserver) {
              capturedObserver.on({ type: 'agent:step', step: 1, action: 'thinking' } as AgentEvent)
              capturedObserver.on({ type: 'llm:start', messageCount: 3 } as AgentEvent)
              capturedObserver.on({
                type: 'llm:end',
                content: 'some long content ' + 'x'.repeat(200),
                durationMs: 100,
              } as AgentEvent)
              capturedObserver.on({ type: 'tool:start', name: 'web_search', args: {} } as AgentEvent)
              capturedObserver.on({ type: 'tool:end', name: 'web_search', durationMs: 50 } as AgentEvent)
              capturedObserver.on({ type: 'error', error: new Error('oops') } as AgentEvent)
            }
            return { content: 'done', durationMs: 0 }
          }),
        }
      }),
    }))

    const { runAgent } = await import('../src/run')
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await runAgent('task', { provider: 'demo', verbose: true })

    const stderrOutput = stderrSpy.mock.calls.map(c => c[0] as string).join('')
    expect(stderrOutput).toContain('[step 1]')
    expect(stderrOutput).toContain('[llm] start')
    expect(stderrOutput).toContain('[llm] done')
    expect(stderrOutput).toContain('[tool] web_search')
    expect(stderrOutput).toContain('[error]')
  })

  it('handles unknown event type in formatEvent', async () => {
    let capturedObserver: { on: (e: AgentEvent) => void } | undefined

    vi.doMock('@agentskit/runtime', () => ({
      createRuntime: vi.fn((opts: { observers?: Array<{ on: (e: AgentEvent) => void }> }) => {
        capturedObserver = opts.observers?.[0]
        return {
          run: vi.fn().mockImplementation(async () => {
            capturedObserver?.on({ type: 'agent:done' as AgentEvent['type'] } as AgentEvent)
            return { content: 'done', durationMs: 0 }
          }),
        }
      }),
    }))

    const { runAgent } = await import('../src/run')
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    await runAgent('task', { provider: 'demo', verbose: true })

    const stderrOutput = stderrSpy.mock.calls.map(c => c[0] as string).join('')
    expect(stderrOutput).toContain('[agent:done]')
  })

  it('passes maxSteps when provided', async () => {
    const createRuntime = vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue({ content: 'done', durationMs: 0 }),
    })
    vi.doMock('@agentskit/runtime', () => ({ createRuntime }))

    const { runAgent } = await import('../src/run')
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await runAgent('task', { provider: 'demo', maxSteps: '5' })
    expect(createRuntime).toHaveBeenCalledWith(expect.objectContaining({ maxSteps: 5 }))
  })
})
