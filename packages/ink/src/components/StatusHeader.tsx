import React from 'react'
import { Box, Text } from 'ink'

export interface StatusHeaderProps {
  title?: string
  provider?: string
  model?: string
  tools?: string[]
  mode?: 'demo' | 'live'
  messageCount?: number
}

export function StatusHeader({
  title = 'AgentsKit CLI',
  provider,
  model,
  tools,
  mode,
  messageCount,
}: StatusHeaderProps) {
  const segments: Array<{ label: string; value: string; color?: string }> = []

  if (provider) segments.push({ label: 'provider', value: provider, color: 'cyan' })
  if (model) segments.push({ label: 'model', value: model, color: 'magenta' })
  if (mode) segments.push({ label: 'mode', value: mode, color: mode === 'live' ? 'green' : 'yellow' })
  if (tools && tools.length > 0) {
    segments.push({ label: 'tools', value: tools.join(','), color: 'blue' })
  }
  if (typeof messageCount === 'number') {
    segments.push({ label: 'msgs', value: String(messageCount), color: 'gray' })
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text color="cyan" bold>
        ✦ {title}
      </Text>
      {segments.length > 0 ? (
        <Box>
          {segments.map((seg, i) => (
            <Box key={seg.label}>
              {i > 0 ? <Text dimColor>  ·  </Text> : null}
              <Text dimColor>{seg.label}=</Text>
              <Text color={seg.color ?? 'white'}>{seg.value}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  )
}
