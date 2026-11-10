import React from 'react'
import { Box, Text } from 'ink'
import { useInkTheme } from './theme'

/** Optional session details shown in the terminal chat header. */
export interface StatusHeaderProps {
  title?: string
  provider?: string
  model?: string
  tools?: string[]
  mode?: 'demo' | 'live'
  messageCount?: number
  sessionId?: string
}

/** Render a title and available provider, model, tool, and session details.
 * @param props Header labels and optional session metadata.
 * @returns A bordered terminal status header.
 * @example
 * ```tsx
 * <StatusHeader provider="openai" model="gpt-4o" mode="live" />
 * ```
 */
export function StatusHeader({
  title = 'AgentsKit CLI',
  provider,
  model,
  tools,
  mode,
  messageCount,
  sessionId,
}: StatusHeaderProps) {
  const theme = useInkTheme()
  const segments: Array<{ label: string; value: string; color?: string }> = []

  if (provider) segments.push({ label: 'provider', value: provider, color: theme.segment.provider })
  if (model) segments.push({ label: 'model', value: model, color: theme.segment.model })
  if (mode) segments.push({ label: 'mode', value: mode, color: mode === 'live' ? theme.segment.modeLive : theme.segment.modeDemo })
  if (tools && tools.length > 0) {
    segments.push({ label: 'tools', value: tools.join(','), color: theme.segment.tools })
  }
  if (typeof messageCount === 'number') {
    segments.push({ label: 'msgs', value: String(messageCount), color: theme.segment.muted })
  }
  if (sessionId) {
    segments.push({ label: 'session', value: sessionId.slice(0, 12), color: theme.segment.muted })
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.header.border} paddingX={1}>
      <Text color={theme.header.title} bold>
        ✦ {title}
      </Text>
      {segments.length > 0 ? (
        <Text wrap="truncate-end">
          {segments.map((seg, i) => {
            let separator: React.ReactNode = null
            if (i > 0) separator = <Text dimColor>  ·  </Text>
            return (
              <React.Fragment key={seg.label}>
                {separator}
                <Text dimColor>{seg.label}=</Text>
                <Text color={seg.color ?? 'white'}>{seg.value}</Text>
              </React.Fragment>
            )
          })}
        </Text>
      ) : null}
    </Box>
  )
}
