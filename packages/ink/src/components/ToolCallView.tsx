import React from 'react'
import { Box, Text } from 'ink'
import type { ToolCall } from '@agentskit/core'

export interface ToolCallViewProps {
  toolCall: ToolCall
  expanded?: boolean
}

export function ToolCallView({ toolCall, expanded = false }: ToolCallViewProps) {
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text color="magenta">
        Tool: {toolCall.name} [{toolCall.status}]
      </Text>
      {expanded ? (
        <>
          <Text dimColor>{JSON.stringify(toolCall.args)}</Text>
          {toolCall.result ? <Text>{toolCall.result}</Text> : null}
          {toolCall.error ? <Text color="red">{toolCall.error}</Text> : null}
        </>
      ) : null}
    </Box>
  )
}
