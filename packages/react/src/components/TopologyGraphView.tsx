import React, { useEffect, useState } from 'react'

/** A topology node with activity counts and its last active timestamp. */
export interface TopologyGraphViewNode {
  id: string
  label: string
  topology: string
  startCount: number
  endCount: number
  errorCount: number
  lastActiveAt: number
}

/** An edge between two topology nodes with an event count. */
export interface TopologyGraphViewEdge {
  id: string
  from: string
  to: string
  count: number
  lastTask?: string
  lastResult?: string
}

/** A complete graph snapshot with nodes, edges, and update time. */
export interface TopologyGraphViewSnapshot {
  nodes: TopologyGraphViewNode[]
  edges: TopologyGraphViewEdge[]
  updatedAt: string
}

/** A source that exposes graph snapshots and notifies subscribers of changes. */
export interface TopologyGraphSource {
  toJSON: () => TopologyGraphViewSnapshot
  subscribe: (handler: (s: TopologyGraphViewSnapshot) => void) => () => void
}

/** Props for rendering a topology source with optional node-click handling. */
export interface TopologyGraphViewProps {
  source: TopologyGraphSource
  onNodeClick?: (nodeId: string) => void
  width?: number
  height?: number
}

function layout(nodes: TopologyGraphViewNode[], width: number, height: number): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  const root = nodes.find(n => n.id === '__root__')
  const others = nodes.filter(n => n.id !== '__root__')
  if (root) out.set(root.id, { x: width / 2, y: 60 })
  const radius = Math.min(width, height) / 2 - 80
  others.forEach((n, i) => {
    const angle = (i / Math.max(others.length, 1)) * Math.PI * 2
    out.set(n.id, {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius + 40,
    })
  })
  return out
}

/**
 * Render a subscribed multi-agent topology graph as an SVG.
 *
 * Clicking a node calls `onNodeClick` when provided.
 * @param props The topology source, optional click callback, and dimensions.
 * @returns The graph SVG element.
 * @example
 * ```tsx
 * <TopologyGraphView source={graph} onNodeClick={(id) => openSession(id)} />
 * ```
 */
export function TopologyGraphView({ source, onNodeClick, width = 600, height = 400 }: TopologyGraphViewProps) {
  const [snap, setSnap] = useState<TopologyGraphViewSnapshot>(() => source.toJSON())

  useEffect(() => source.subscribe(setSnap), [source])

  const positions = layout(snap.nodes, width, height)

  return (
    <svg
      data-ak-topology-graph=""
      data-ak-topology-updated={snap.updatedAt}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <g data-ak-topology-edges="">
        {snap.edges.map(edge => {
          const from = positions.get(edge.from)
          const to = positions.get(edge.to)
          if (!from || !to) return null
          return (
            <line
              key={edge.id}
              data-ak-topology-edge=""
              data-ak-topology-edge-count={edge.count}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            >
              <title>{`${edge.from} → ${edge.to} (${edge.count}) ${edge.lastTask ?? ''}`}</title>
            </line>
          )
        })}
      </g>
      <g data-ak-topology-nodes="">
        {snap.nodes.map(node => {
          const pos = positions.get(node.id)
          if (!pos) return null
          const size = 16 + Math.min(node.startCount * 2, 16)
          let status: 'error' | 'done' | 'pending'
          if (node.errorCount > 0) {
            status = 'error'
          } else if (node.endCount > 0) {
            status = 'done'
          } else {
            status = 'pending'
          }
          return (
            <g
              key={node.id}
              data-ak-topology-node=""
              data-ak-topology-status={status}
              data-ak-topology-id={node.id}
              transform={`translate(${pos.x},${pos.y})`}
              onClick={onNodeClick ? () => onNodeClick(node.id) : undefined}
              style={onNodeClick ? { cursor: 'pointer' } : undefined}
            >
              <circle r={size} data-ak-topology-node-circle="" />
              <text data-ak-topology-node-label="" textAnchor="middle" dy="0.3em">
                {node.id === '__root__' ? node.topology : node.label}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
