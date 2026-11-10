import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { useInkTheme } from './theme'

/** Counts and latest activity for one node in a topology snapshot. */
export interface TopologyGraphViewNode {
  id: string
  label: string
  topology: string
  startCount: number
  endCount: number
  errorCount: number
  lastActiveAt: number
}

/** Activity summary for one directed edge in a topology snapshot. */
export interface TopologyGraphViewEdge {
  id: string
  from: string
  to: string
  count: number
  lastTask?: string
  lastResult?: string
}

/** Nodes and edges returned by a topology graph source. */
export interface TopologyGraphViewSnapshot {
  nodes: TopologyGraphViewNode[]
  edges: TopologyGraphViewEdge[]
  updatedAt: string
}

/** Read and subscribe to topology snapshots for the terminal graph view. */
export interface TopologyGraphSource {
  toJSON: () => TopologyGraphViewSnapshot
  subscribe: (handler: (s: TopologyGraphViewSnapshot) => void) => () => void
}

/** Source of topology updates displayed by the graph view. */
export interface TopologyGraphViewProps {
  source: TopologyGraphSource
}

/** Render topology nodes and their activity counts in the terminal.
 * @param props The source of topology snapshots.
 * @returns A terminal tree view of the topology nodes.
 * @example
 * ```tsx
 * <TopologyGraphView source={topology} />
 * ```
 */
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
        let status = { icon: '…', color: theme.toolStatus.running.color }
        if (node.endCount > 0) {
          status = { icon: '✓', color: theme.toolStatus.complete.color }
        }
        if (node.errorCount > 0) {
          status = { icon: '✗', color: theme.toolStatus.error.color }
        }
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
