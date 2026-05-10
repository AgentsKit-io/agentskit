import React, { useEffect, useState } from 'react'

/**
 * Headless renderer for a multi-agent topology graph. Pass any source
 * that implements `subscribe(snapshot => …)` (e.g. the
 * `TopologyGraph` from `@agentskit/observability`) and the component
 * draws nodes + edges in an SVG with `data-ak-*` attributes for
 * styling.
 *
 * Click a node to drill into its session — wire `onNodeClick` to your
 * devtools router.
 */

export interface TopologyGraphViewNode {
  id: string
  label: string
  topology: string
  startCount: number
  endCount: number
  errorCount: number
  lastActiveAt: number
}

export interface TopologyGraphViewEdge {
  id: string
  from: string
  to: string
  count: number
  lastTask?: string
  lastResult?: string
}

export interface TopologyGraphViewSnapshot {
  nodes: TopologyGraphViewNode[]
  edges: TopologyGraphViewEdge[]
  updatedAt: string
}

export interface TopologyGraphSource {
  toJSON: () => TopologyGraphViewSnapshot
  subscribe: (handler: (s: TopologyGraphViewSnapshot) => void) => () => void
}

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
          const status = node.errorCount > 0 ? 'error' : node.endCount > 0 ? 'done' : 'pending'
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
