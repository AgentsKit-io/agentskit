import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import {
  TopologyGraphView,
  type TopologyGraphSource,
  type TopologyGraphViewSnapshot,
} from '../../src/components/TopologyGraphView'

function makeSnapshot(overrides?: Partial<TopologyGraphViewSnapshot>): TopologyGraphViewSnapshot {
  return {
    nodes: [],
    edges: [],
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSource(snap: TopologyGraphViewSnapshot): TopologyGraphSource & { _emit: (s: TopologyGraphViewSnapshot) => void } {
  let handler: ((s: TopologyGraphViewSnapshot) => void) | null = null
  return {
    toJSON: () => snap,
    subscribe: (h) => {
      handler = h
      return () => { handler = null }
    },
    _emit: (s) => handler?.(s),
  }
}

describe('TopologyGraphView', () => {
  it('renders an SVG element with data-ak-topology-graph attribute', () => {
    const source = makeSource(makeSnapshot())
    const { container } = render(<TopologyGraphView source={source} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('data-ak-topology-graph')
  })

  it('renders nodes from snapshot', () => {
    const snap = makeSnapshot({
      nodes: [
        { id: 'agent-1', label: 'Agent 1', topology: 'main', startCount: 1, endCount: 1, errorCount: 0, lastActiveAt: 0 },
      ],
    })
    const source = makeSource(snap)
    const { container } = render(<TopologyGraphView source={source} />)
    expect(container.querySelector('[data-ak-topology-id="agent-1"]')).toBeInTheDocument()
  })

  it('renders edges between nodes', () => {
    const snap = makeSnapshot({
      nodes: [
        { id: 'a', label: 'A', topology: 'main', startCount: 1, endCount: 1, errorCount: 0, lastActiveAt: 0 },
        { id: 'b', label: 'B', topology: 'main', startCount: 1, endCount: 0, errorCount: 0, lastActiveAt: 0 },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'b', count: 2 },
      ],
    })
    const source = makeSource(snap)
    const { container } = render(<TopologyGraphView source={source} />)
    const edge = container.querySelector('[data-ak-topology-edge]')
    expect(edge).toBeInTheDocument()
    expect(edge).toHaveAttribute('data-ak-topology-edge-count', '2')
  })

  it('sets data-ak-topology-status to error when errorCount > 0', () => {
    const snap = makeSnapshot({
      nodes: [
        { id: 'err-agent', label: 'Err', topology: 'main', startCount: 1, endCount: 0, errorCount: 3, lastActiveAt: 0 },
      ],
    })
    const source = makeSource(snap)
    const { container } = render(<TopologyGraphView source={source} />)
    expect(container.querySelector('[data-ak-topology-status="error"]')).toBeInTheDocument()
  })

  it('sets data-ak-topology-status to done when endCount > 0 and no errors', () => {
    const snap = makeSnapshot({
      nodes: [
        { id: 'done-agent', label: 'Done', topology: 'main', startCount: 1, endCount: 2, errorCount: 0, lastActiveAt: 0 },
      ],
    })
    const source = makeSource(snap)
    const { container } = render(<TopologyGraphView source={source} />)
    expect(container.querySelector('[data-ak-topology-status="done"]')).toBeInTheDocument()
  })

  it('sets data-ak-topology-status to pending when no ends and no errors', () => {
    const snap = makeSnapshot({
      nodes: [
        { id: 'pending-agent', label: 'Pending', topology: 'main', startCount: 1, endCount: 0, errorCount: 0, lastActiveAt: 0 },
      ],
    })
    const source = makeSource(snap)
    const { container } = render(<TopologyGraphView source={source} />)
    expect(container.querySelector('[data-ak-topology-status="pending"]')).toBeInTheDocument()
  })

  it('uses topology label for __root__ node', () => {
    const snap = makeSnapshot({
      nodes: [
        { id: '__root__', label: 'root-label', topology: 'my-topology', startCount: 0, endCount: 0, errorCount: 0, lastActiveAt: 0 },
      ],
    })
    const source = makeSource(snap)
    render(<TopologyGraphView source={source} />)
    expect(screen.getByText('my-topology')).toBeInTheDocument()
  })

  it('calls onNodeClick with node id when a node is clicked', () => {
    const onNodeClick = vi.fn()
    const snap = makeSnapshot({
      nodes: [
        { id: 'agent-x', label: 'X', topology: 'main', startCount: 1, endCount: 1, errorCount: 0, lastActiveAt: 0 },
      ],
    })
    const source = makeSource(snap)
    const { container } = render(<TopologyGraphView source={source} onNodeClick={onNodeClick} />)
    const nodeGroup = container.querySelector('[data-ak-topology-id="agent-x"]')!
    fireEvent.click(nodeGroup)
    expect(onNodeClick).toHaveBeenCalledWith('agent-x')
  })

  it('accepts custom width and height', () => {
    const source = makeSource(makeSnapshot())
    const { container } = render(<TopologyGraphView source={source} width={800} height={600} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '800')
    expect(svg).toHaveAttribute('height', '600')
  })

  it('updates when source emits a new snapshot', () => {
    const source = makeSource(makeSnapshot({ updatedAt: 'initial' }))
    const { container } = render(<TopologyGraphView source={source} />)
    expect(container.querySelector('svg')).toHaveAttribute('data-ak-topology-updated', 'initial')

    act(() => {
      source._emit(makeSnapshot({ updatedAt: 'updated' }))
    })
    expect(container.querySelector('svg')).toHaveAttribute('data-ak-topology-updated', 'updated')
  })

  it('skips edges with missing node positions', () => {
    const snap = makeSnapshot({
      nodes: [
        { id: 'a', label: 'A', topology: 'main', startCount: 1, endCount: 1, errorCount: 0, lastActiveAt: 0 },
      ],
      edges: [
        { id: 'e-orphan', from: 'a', to: 'missing-node', count: 1 },
      ],
    })
    const source = makeSource(snap)
    const { container } = render(<TopologyGraphView source={source} />)
    // edge should not render since 'missing-node' has no position
    expect(container.querySelector('[data-ak-topology-edge]')).toBeNull()
  })

  it('renders with __root__ node placed at top (centered)', () => {
    const snap = makeSnapshot({
      nodes: [
        { id: '__root__', label: 'root', topology: 'main', startCount: 0, endCount: 0, errorCount: 0, lastActiveAt: 0 },
        { id: 'child', label: 'Child', topology: 'main', startCount: 1, endCount: 0, errorCount: 0, lastActiveAt: 0 },
      ],
    })
    const source = makeSource(snap)
    const { container } = render(<TopologyGraphView source={source} />)
    expect(container.querySelector('[data-ak-topology-id="__root__"]')).toBeInTheDocument()
    expect(container.querySelector('[data-ak-topology-id="child"]')).toBeInTheDocument()
  })
})
