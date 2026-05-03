import { describe, expect, it, vi } from 'vitest'
import {
  devtoolsTools,
  type RuntimeInspector,
  type SessionDetail,
  type SessionSummary,
} from '../src/mcp-devtools'

const stubCtx = { messages: [], call: { id: 'c', name: 'x', args: {}, status: 'running' as const } }

const SESSION: SessionSummary = {
  id: 's-1',
  status: 'running',
  startedAt: '2026-01-01T00:00:00.000Z',
  messageCount: 4,
  label: 'support',
}

const DETAIL: SessionDetail = {
  ...SESSION,
  messages: [
    { id: 'm-1', role: 'user', content: 'hi', createdAt: '2026-01-01T00:00:01.000Z' },
    { id: 'm-2', role: 'assistant', content: 'hello', createdAt: '2026-01-01T00:00:02.000Z' },
  ],
  tokensUsed: 42,
  costUsd: 0.0001,
}

describe('devtoolsTools — capability gating', () => {
  it('throws when inspector missing', () => {
    expect(() =>
      devtoolsTools({ inspector: undefined as unknown as RuntimeInspector }),
    ).toThrow(/inspector is required/)
  })

  it('throws when inspector exposes nothing', () => {
    expect(() => devtoolsTools({ inspector: {} })).toThrow(/at least one/)
  })

  it('only registers tools whose inspector method exists', () => {
    const inspector: RuntimeInspector = { listSessions: async () => [SESSION] }
    const names = devtoolsTools({ inspector }).map(t => t.name)
    expect(names).toEqual(['devtools_list_sessions'])
  })

  it('registers every tool when inspector implements every method', () => {
    const inspector: RuntimeInspector = {
      listSessions: async () => [SESSION],
      inspectSession: async () => DETAIL,
      listTools: async () => [],
      listSkills: async () => [],
      listMemories: async () => [],
      pauseRuntime: async () => ({ ok: true }),
      resumeRuntime: async () => ({ ok: true }),
      stepRuntime: async () => ({ step: 1, status: 'paused' }),
      replaySession: async () => ({ replayId: 'r', fromStep: 0, status: 'pending' }),
      listEvals: async () => [],
      runEval: async () => ({ name: 'e', passed: 0, failed: 0, durationMs: 0 }),
    }
    const names = devtoolsTools({ inspector }).map(t => t.name).sort()
    expect(names).toEqual(
      [
        'devtools_inspect_session',
        'devtools_list_evals',
        'devtools_list_memories',
        'devtools_list_sessions',
        'devtools_list_skills',
        'devtools_list_tools',
        'devtools_pause_runtime',
        'devtools_replay_session',
        'devtools_resume_runtime',
        'devtools_run_eval',
        'devtools_step_runtime',
      ].sort(),
    )
  })
})

describe('devtoolsTools — execution', () => {
  it('list_sessions calls inspector and wraps result', async () => {
    const inspector: RuntimeInspector = { listSessions: vi.fn(async () => [SESSION]) }
    const tool = devtoolsTools({ inspector }).find(t => t.name === 'devtools_list_sessions')!
    const result = (await tool.execute!({}, stubCtx)) as { sessions: SessionSummary[] }
    expect(result.sessions).toEqual([SESSION])
    expect(inspector.listSessions).toHaveBeenCalledTimes(1)
  })

  it('inspect_session forwards session_id', async () => {
    const inspector: RuntimeInspector = { inspectSession: vi.fn(async () => DETAIL) }
    const tool = devtoolsTools({ inspector }).find(t => t.name === 'devtools_inspect_session')!
    const result = (await tool.execute!({ session_id: 's-1' }, stubCtx)) as SessionDetail
    expect(result.id).toBe('s-1')
    expect(inspector.inspectSession).toHaveBeenCalledWith('s-1')
  })

  it('list_memories forwards optional scope', async () => {
    const inspector: RuntimeInspector = { listMemories: vi.fn(async () => []) }
    const tool = devtoolsTools({ inspector }).find(t => t.name === 'devtools_list_memories')!
    await tool.execute!({ scope: 'tenant-42' }, stubCtx)
    expect(inspector.listMemories).toHaveBeenCalledWith('tenant-42')
  })

  it('replay_session forwards from_step when provided', async () => {
    const inspector: RuntimeInspector = {
      replaySession: vi.fn(async () => ({ replayId: 'r', fromStep: 5, status: 'pending' as const })),
    }
    const tool = devtoolsTools({ inspector }).find(t => t.name === 'devtools_replay_session')!
    await tool.execute!({ session_id: 's-1', from_step: 5 }, stubCtx)
    expect(inspector.replaySession).toHaveBeenCalledWith('s-1', 5)
  })

  it('destructive tools set requiresConfirmation: true', () => {
    const inspector: RuntimeInspector = {
      listSessions: async () => [],
      pauseRuntime: async () => ({ ok: true }),
      resumeRuntime: async () => ({ ok: true }),
    }
    const tools = devtoolsTools({ inspector })
    expect(tools.find(t => t.name === 'devtools_pause_runtime')!.requiresConfirmation).toBe(true)
    expect(tools.find(t => t.name === 'devtools_resume_runtime')!.requiresConfirmation).toBe(true)
  })
})

