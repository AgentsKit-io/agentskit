import { describe, expect, it, vi } from 'vitest'
import { createTopologyGraph } from '../src/topology-graph'

describe('createTopologyGraph', () => {
  it('builds nodes + edges from a supervisor run', () => {
    const g = createTopologyGraph({ now: () => 1 })
    g.ingest({ topology: 'supervisor', phase: 'dispatch', agent: 'researcher', task: 'find' })
    g.ingest({ topology: 'supervisor', phase: 'agent:start', agent: 'researcher' })
    g.ingest({ topology: 'supervisor', phase: 'agent:end', agent: 'researcher', result: 'done' })
    g.ingest({ topology: 'supervisor', phase: 'dispatch', agent: 'critic', task: 'check' })
    g.ingest({ topology: 'supervisor', phase: 'agent:end', agent: 'critic', result: 'ok' })
    g.ingest({ topology: 'supervisor', phase: 'merge' })
    g.ingest({ topology: 'supervisor', phase: 'done' })

    const snap = g.toJSON()
    expect(snap.nodes.map(n => n.id).sort()).toEqual(['__root__', 'critic', 'researcher'])
    const dispatchEdges = snap.edges.filter(e => e.from === '__root__')
    expect(dispatchEdges).toHaveLength(2)
    expect(snap.nodes.find(n => n.id === 'researcher')!.endCount).toBe(1)
  })

  it('emits to subscribers on each ingest', () => {
    const g = createTopologyGraph()
    const handler = vi.fn()
    g.subscribe(handler)
    g.ingest({ topology: 'swarm', phase: 'dispatch', agent: 'a' })
    g.ingest({ topology: 'swarm', phase: 'agent:end', agent: 'a', result: 'r' })
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('renders mermaid', () => {
    const g = createTopologyGraph()
    g.ingest({ topology: 'supervisor', phase: 'dispatch', agent: 'researcher' })
    g.ingest({ topology: 'supervisor', phase: 'agent:end', agent: 'researcher' })
    const md = g.toMermaid()
    expect(md).toContain('graph LR')
    expect(md).toContain('researcher')
    expect(md).toContain('-->')
  })

  it('renders ASCII for ink', () => {
    const g = createTopologyGraph()
    g.ingest({ topology: 'supervisor', phase: 'dispatch', agent: 'a' })
    g.ingest({ topology: 'supervisor', phase: 'agent:start', agent: 'a' })
    g.ingest({ topology: 'supervisor', phase: 'agent:end', agent: 'a' })
    const ascii = g.toAscii()
    expect(ascii).toContain('(supervisor)')
    expect(ascii).toContain('a')
    expect(ascii).toContain('✓')
  })

  it('reset clears state and notifies subscribers', () => {
    const g = createTopologyGraph()
    g.ingest({ topology: 'supervisor', phase: 'dispatch', agent: 'a' })
    const handler = vi.fn()
    g.subscribe(handler)
    g.reset()
    expect(g.toJSON().nodes).toEqual([])
    expect(handler).toHaveBeenCalledOnce()
  })
})
