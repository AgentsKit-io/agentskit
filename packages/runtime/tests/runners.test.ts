import { tempDir } from '@agentskit/cross-platform'
import { describe, expect, it } from 'vitest'
import {
  claudeCodeRunner,
  codexRunner,
  copilotKitRunner,
  createRunnerRegistry,
  createTraceRecorder,
  type AcpTransport,
  type AgentRunner,
  type CliOutcome,
  type RunnerTask,
} from '../src/runners'
import { hermesAcpRunner } from '../src/runners/acp'

const fakeRunner: AgentRunner = {
  id: 'fake',
  async run(task) {
    const trace = createTraceRecorder('fake')
    trace.end(trace.child('fake.step'))
    trace.end(trace.root)
    return {
      status: 'completed',
      output: `done: ${task.prompt}`,
      artifacts: [{ kind: 'text', name: 'note.txt', content: 'hi' }],
      trace: trace.spans(),
    }
  },
}

/** Contract every runner must satisfy. */
async function assertRunnerContract(runner: AgentRunner, task: RunnerTask): Promise<void> {
  const result = await runner.run(task)
  expect(result.status).toBe('completed')
  expect(typeof result.output).toBe('string')
  expect(Array.isArray(result.artifacts)).toBe(true)
  const [root, ...children] = result.trace
  expect(root.parentId).toBeNull()
  expect(root.endTime).toBeTypeOf('number')
  for (const span of result.trace) {
    expect(['ok', 'error']).toContain(span.status)
    expect(span.attributes).toBeTypeOf('object')
  }
  for (const child of children) expect(child.parentId).toBe(root.id)
}

const task: RunnerTask = { prompt: 'say hi', cwd: tempDir(), allowedTools: ['Read', 'Edit'], budget: { maxTurns: 3 } }
const ok = (stdout: string): CliOutcome => ({ code: 0, stdout, stderr: '', timedOut: false, aborted: false })

describe('runner contract', () => {
  it('holds for a fake runner', async () => {
    await assertRunnerContract(fakeRunner, task)
  })

  it('holds for claude code and maps flags', async () => {
    let seen: string[] = []
    const runner = claudeCodeRunner({
      exec: async (_c, args) => { seen = args; return ok(JSON.stringify({ result: 'hi', total_cost_usd: 0.01 })) },
    })
    await assertRunnerContract(runner, task)
    expect(seen).toEqual(['-p', 'say hi', '--output-format', 'json', '--allowedTools', 'Read,Edit', '--max-turns', '3'])
    expect((await runner.run(task)).costUsd).toBe(0.01)
  })

  it('holds for codex', async () => {
    let seen: string[] = []
    const runner = codexRunner({ exec: async (_c, args) => { seen = args; return ok('out\n') } })
    await assertRunnerContract(runner, task)
    expect(seen).toEqual(['exec', '--cd', task.cwd, 'say hi'])
  })

  it('holds for hermes over ACP', async () => {
    const methods: string[] = []
    const connect = (): AcpTransport => {
      let notify: (m: string, p: unknown) => void = () => undefined
      return {
        onNotification: h => { notify = h },
        close: () => undefined,
        async request(method) {
          methods.push(method)
          if (method === 'session/new') return { sessionId: 's1' }
          if (method === 'session/prompt') {
            notify('session/update', { update: { sessionUpdate: 'agent_message_chunk', content: { text: 'hel' } } })
            notify('session/update', { update: { sessionUpdate: 'agent_message_chunk', content: { text: 'lo' } } })
          }
          return {}
        },
      }
    }
    const runner = hermesAcpRunner({ connect })
    await assertRunnerContract(runner, task)
    expect((await runner.run(task)).output).toBe('hello')
    expect(methods.slice(0, 3)).toEqual(['initialize', 'session/new', 'session/prompt'])
  })

  it('holds for copilotkit', async () => {
    const fetchFn = (async () => new Response(JSON.stringify({ output: 'ok', costUsd: 1 }))) as typeof fetch
    await assertRunnerContract(copilotKitRunner({ url: 'http://x', fetch: fetchFn }), task)
  })
})

describe('failure modes', () => {
  it('reports non-zero exit as failed with an error trace', async () => {
    const runner = codexRunner({ exec: async () => ({ code: 2, stdout: '', stderr: 'boom', timedOut: false, aborted: false }) })
    const result = await runner.run(task)
    expect(result.status).toBe('failed')
    expect(result.error).toBe('boom')
    expect(result.trace.every(s => s.status === 'error')).toBe(true)
  })

  it('reports a missing binary as failed', async () => {
    const runner = codexRunner({ exec: async () => { throw new Error('ENOENT') } })
    expect((await runner.run(task)).status).toBe('failed')
  })

  it('reports http errors as failed', async () => {
    const fetchFn = (async () => new Response('nope', { status: 500 })) as typeof fetch
    const result = await copilotKitRunner({ url: 'http://x', fetch: fetchFn }).run(task)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('500')
  })
})

describe('registry', () => {
  it('selects by id and lists unknown ids', () => {
    const registry = createRunnerRegistry([fakeRunner])
    expect(registry.get('fake')).toBe(fakeRunner)
    expect(() => registry.get('nope')).toThrow(/Available: fake/)
  })
})
