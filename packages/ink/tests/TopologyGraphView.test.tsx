import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import {
  TopologyGraphView,
  type TopologyGraphViewSnapshot,
  type TopologyGraphSource,
} from '../src/components/TopologyGraphView'

// ── helpers ───────────────────────────────────────────────────────────────────

function makeSource(snap: TopologyGraphViewSnapshot): TopologyGraphSource {
  const handlers: Array<(s: TopologyGraphViewSnapshot) => void> = []
  return {
    toJSON: () => snap,
    subscribe: (handler) => {
      handlers.push(handler)
      return () => {
        const idx = handlers.indexOf(handler)
        if (idx !== -1) handlers.splice(idx, 1)
      }
    },
  }
}

const emptySnap: TopologyGraphViewSnapshot = {
  nodes: [],
  edges: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const rootOnlySnap: TopologyGraphViewSnapshot = {
  nodes: [
    {
      id: '__root__',
      label: 'root',
      topology: 'sequential',
      startCount: 1,
      endCount: 1,
      errorCount: 0,
      lastActiveAt: 0,
    },
  ],
  edges: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('TopologyGraphView', () => {
  it('renders with no nodes (empty snapshot)', () => {
    const source = makeSource(emptySnap)
    const { lastFrame } = render(<TopologyGraphView source={source} />)
    // Should show fallback topology label
    expect(lastFrame()).toContain('topology')
  })

  it('renders the root topology label', () => {
    const source = makeSource(rootOnlySnap)
    const { lastFrame } = render(<TopologyGraphView source={source} />)
    expect(lastFrame()).toContain('sequential')
  })

  it('renders non-root nodes with their labels', () => {
    const snap: TopologyGraphViewSnapshot = {
      ...rootOnlySnap,
      nodes: [
        ...rootOnlySnap.nodes,
        {
          id: 'agent-1',
          label: 'Researcher',
          topology: 'parallel',
          startCount: 3,
          endCount: 2,
          errorCount: 0,
          lastActiveAt: 1000,
        },
      ],
    }
    const source = makeSource(snap)
    const { lastFrame } = render(<TopologyGraphView source={source} />)
    const output = lastFrame()
    expect(output).toContain('Researcher')
    expect(output).toContain('3 starts')
    expect(output).toContain('2 done')
  })

  it('shows completed icon for nodes with endCount > 0 and no errors', () => {
    const snap: TopologyGraphViewSnapshot = {
      ...rootOnlySnap,
      nodes: [
        ...rootOnlySnap.nodes,
        {
          id: 'done-agent',
          label: 'Summarizer',
          topology: 'sequential',
          startCount: 1,
          endCount: 1,
          errorCount: 0,
          lastActiveAt: 0,
        },
      ],
    }
    const { lastFrame } = render(<TopologyGraphView source={makeSource(snap)} />)
    expect(lastFrame()).toContain('✓')
  })

  it('shows error icon for nodes with errorCount > 0', () => {
    const snap: TopologyGraphViewSnapshot = {
      ...rootOnlySnap,
      nodes: [
        ...rootOnlySnap.nodes,
        {
          id: 'err-agent',
          label: 'Coder',
          topology: 'sequential',
          startCount: 2,
          endCount: 0,
          errorCount: 1,
          lastActiveAt: 0,
        },
      ],
    }
    const { lastFrame } = render(<TopologyGraphView source={makeSource(snap)} />)
    expect(lastFrame()).toContain('✗')
  })

  it('shows running icon for nodes with no completions and no errors', () => {
    const snap: TopologyGraphViewSnapshot = {
      ...rootOnlySnap,
      nodes: [
        ...rootOnlySnap.nodes,
        {
          id: 'running-agent',
          label: 'Planner',
          topology: 'sequential',
          startCount: 1,
          endCount: 0,
          errorCount: 0,
          lastActiveAt: 0,
        },
      ],
    }
    const { lastFrame } = render(<TopologyGraphView source={makeSource(snap)} />)
    expect(lastFrame()).toContain('…')
  })

  it('falls back to "topology" when root node has no topology', () => {
    const snap: TopologyGraphViewSnapshot = {
      nodes: [],
      edges: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const source = makeSource(snap)
    const { lastFrame } = render(<TopologyGraphView source={source} />)
    expect(lastFrame()).toContain('topology')
  })

  it('subscribe is called and cleanup unsubscribes on unmount', () => {
    const subscribeSpy = vi.fn((handler) => {
      return vi.fn() // unsubscribe
    })
    const source: TopologyGraphSource = {
      toJSON: () => emptySnap,
      subscribe: subscribeSpy,
    }
    const { unmount } = render(<TopologyGraphView source={source} />)
    expect(subscribeSpy).toHaveBeenCalledTimes(1)
    unmount()
    // The returned cleanup should have been called
    const unsubscribe = subscribeSpy.mock.results[0].value
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates the snapshot when source emits a new state', async () => {
    let emitUpdate: ((s: TopologyGraphViewSnapshot) => void) | null = null

    const source: TopologyGraphSource = {
      toJSON: () => rootOnlySnap,
      subscribe: (handler) => {
        emitUpdate = handler
        return () => {}
      },
    }

    const { lastFrame } = render(<TopologyGraphView source={source} />)

    // Initially shows 'sequential'
    expect(lastFrame()).toContain('sequential')

    // Push an updated snapshot
    const updated: TopologyGraphViewSnapshot = {
      ...rootOnlySnap,
      nodes: [
        {
          id: '__root__',
          label: 'root',
          topology: 'reactive',
          startCount: 5,
          endCount: 5,
          errorCount: 0,
          lastActiveAt: 0,
        },
      ],
    }
    emitUpdate!(updated)
    await vi.waitFor(() => expect(lastFrame()).toContain('reactive'))
  })

  it('renders multiple non-root nodes', () => {
    const snap: TopologyGraphViewSnapshot = {
      nodes: [
        {
          id: '__root__',
          label: 'root',
          topology: 'parallel',
          startCount: 1,
          endCount: 1,
          errorCount: 0,
          lastActiveAt: 0,
        },
        {
          id: 'agent-a',
          label: 'AgentA',
          topology: 'parallel',
          startCount: 2,
          endCount: 2,
          errorCount: 0,
          lastActiveAt: 0,
        },
        {
          id: 'agent-b',
          label: 'AgentB',
          topology: 'parallel',
          startCount: 1,
          endCount: 0,
          errorCount: 1,
          lastActiveAt: 0,
        },
      ],
      edges: [{ id: 'e1', from: 'agent-a', to: 'agent-b', count: 1 }],
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const { lastFrame } = render(<TopologyGraphView source={makeSource(snap)} />)
    const output = lastFrame()
    expect(output).toContain('AgentA')
    expect(output).toContain('AgentB')
    expect(output).toContain('parallel')
  })
})
