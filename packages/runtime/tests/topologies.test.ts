import { describe, expect, it, vi } from 'vitest'
import {
  blackboard,
  hierarchical,
  supervisor,
  swarm,
  type AgentHandle,
} from '../src/topologies'

function agent(name: string, respond: (task: string) => string | Promise<string>, opts: { throws?: boolean } = {}): AgentHandle {
  return {
    name,
    async run(task) {
      if (opts.throws) throw new Error(`${name} failed`)
      return respond(task)
    },
  }
}

describe('supervisor', () => {
  it('delegates to a worker and synthesizes via supervisor', async () => {
    const worker = agent('w', async () => 'worker output')
    const sup = agent('sup', async (task) => `synth: ${task.slice(0, 40)}`)
    const team = supervisor({ supervisor: sup, workers: [worker] })
    const out = await team.run('solve x')
    expect(out.startsWith('synth:')).toBe(true)
  })

  it('rejects empty workers', () => {
    const sup = agent('s', async () => 's')
    expect(() => supervisor({ supervisor: sup, workers: [] })).toThrow(/≥ 1 worker/)
  })

  it('round-robins workers across rounds', async () => {
    const calls: string[] = []
    const w1 = agent('w1', async () => {
      calls.push('w1')
      return 'a'
    })
    const w2 = agent('w2', async () => {
      calls.push('w2')
      return 'b'
    })
    const sup = agent('sup', async () => 'ok')
    const team = supervisor({ supervisor: sup, workers: [w1, w2], maxRounds: 4 })
    await team.run('t')
    expect(calls).toEqual(['w1', 'w2', 'w1', 'w2'])
  })

  it('custom route picks the worker', async () => {
    const w1 = agent('w1', async () => 'A')
    const w2 = agent('w2', async () => 'B')
    const sup = agent('sup', async t => t.includes('B') ? 'chose-b' : 'chose-a')
    const team = supervisor({
      supervisor: sup,
      workers: [w1, w2],
      route: () => w2,
    })
    expect(await team.run('t')).toBe('chose-b')
  })

  it('onEvent fires start/end/done', async () => {
    const events: string[] = []
    const team = supervisor({
      supervisor: agent('sup', async () => 'done'),
      workers: [agent('w', async () => 'res')],
      onEvent: e => events.push(e.phase),
    })
    await team.run('t')
    expect(events).toContain('dispatch')
    expect(events).toContain('agent:start')
    expect(events).toContain('agent:end')
    expect(events).toContain('done')
  })
})

describe('swarm', () => {
  it('broadcasts to all members and merges longest by default', async () => {
    const s = swarm({
      members: [
        agent('short', async () => 'ok'),
        agent('long', async () => 'a longer answer'),
      ],
    })
    expect(await s.run('t')).toBe('a longer answer')
  })

  it('custom merge', async () => {
    const s = swarm({
      members: [agent('a', async () => 'x'), agent('b', async () => 'y')],
      merge: results => results.map(r => r.agent).join(','),
    })
    expect(await s.run('t')).toBe('a,b')
  })

  it('tolerates one failing member', async () => {
    const s = swarm({
      members: [agent('ok', async () => 'hello'), agent('bad', async () => '', { throws: true })],
    })
    expect(await s.run('t')).toBe('hello')
  })

  it('throws when all members fail', async () => {
    const s = swarm({
      members: [agent('a', async () => '', { throws: true }), agent('b', async () => '', { throws: true })],
    })
    await expect(s.run('t')).rejects.toThrow(/every swarm member failed/)
  })

  it('timeoutMs aborts slow members', async () => {
    const s = swarm({
      members: [
        agent('fast', async () => 'quick'),
        { name: 'slow', run: () => new Promise(res => setTimeout(() => res('late'), 200)) },
      ],
      timeoutMs: 30,
    })
    expect(await s.run('t')).toBe('quick')
  })

  it('rejects empty members', () => {
    expect(() => swarm({ members: [] })).toThrow(/≥ 1 member/)
  })
})

describe('hierarchical', () => {
  const leafA = agent('leaf-a', async () => 'A result')
  const leafB = agent('leaf-b', async () => 'B result')
  const root = agent('root', async () => 'root result')

  it('runs root when no children match', async () => {
    const tree = hierarchical({
      root: { agent: root, children: [{ agent: leafA, tags: ['cat'] }] },
    })
    expect(await tree.run('dog query')).toBe('root result')
  })

  it('descends to a tagged child when matched', async () => {
    const tree = hierarchical({
      root: {
        agent: root,
        children: [
          { agent: leafA, tags: ['cat'] },
          { agent: leafB, tags: ['dog'] },
        ],
      },
    })
    expect(await tree.run('tell me about dog food')).toBe('B result')
  })

  it('custom route overrides default', async () => {
    const tree = hierarchical({
      root: { agent: root, children: [{ agent: leafA }, { agent: leafB }] },
      route: ({ node }) => node.children?.[1],
    })
    expect(await tree.run('anything')).toBe('B result')
  })

  it('maxDepth caps descent', async () => {
    const level3 = agent('l3', async () => 'L3')
    const tree = hierarchical({
      root: { agent: root, children: [{ agent: leafA, children: [{ agent: level3 }] }] },
      route: ({ node }) => node.children?.[0],
      maxDepth: 1,
    })
    expect(await tree.run('anything')).toBe('A result')
  })
})

describe('blackboard', () => {
  it('iterates agents and accumulates on the board', async () => {
    const recorded: string[] = []
    const a = agent('planner', async board => {
      recorded.push(`planner saw ${board.length} chars`)
      return 'plan: split work'
    })
    const b = agent('coder', async board => {
      recorded.push(`coder saw ${board.length} chars`)
      return 'code: done'
    })
    const bb = blackboard({ agents: [a, b], maxIterations: 1 })
    const result = await bb.run('build it')
    expect(result).toContain('plan: split work')
    expect(result).toContain('code: done')
    expect(recorded).toHaveLength(2)
  })

  it('isDone stops the loop', async () => {
    const fn = vi.fn(async () => 'increment')
    const bb = blackboard({
      agents: [{ name: 'n', run: fn }],
      maxIterations: 5,
      isDone: (_board, iteration) => iteration >= 2,
    })
    await bb.run('t')
    expect(fn.mock.calls.length).toBe(2)
  })

  it('rejects empty agents', () => {
    expect(() => blackboard({ agents: [] })).toThrow(/≥ 1 agent/)
  })
})
