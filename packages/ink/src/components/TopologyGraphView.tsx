import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { useInkTheme } from './theme'

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
}

export function TopologyGraphView({ source }: TopologyGraphViewProps) {
  const theme = useInkTheme()
  const [snap, setSnap] = useState<TopologyGraphViewSnapshot>(() => source.toJSON())

  useEffect(() => source.subscribe(setSnap), [source])

  const root = snap.nodes.find(n => n.id === '__root__')
  const others = snap.nodes.filter(n => n.id !== '__root__')

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>({root?.topology ?? 'topology'})</Text>
      {others.map(node => {
        const status =
          node.errorCount > 0
            ? { icon: '✗', color: theme.toolStatus.error.color }
            : node.endCount > 0
              ? { icon: '✓', color: theme.toolStatus.complete.color }
              : { icon: '…', color: theme.toolStatus.running.color }
        return (
          <Box key={node.id}>
            <Text color={status.color}>
              {'  ├─ '}
              {status.icon} {node.label}
            </Text>
            <Text dimColor>
              {'  '}({node.startCount} starts, {node.endCount} done)
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
