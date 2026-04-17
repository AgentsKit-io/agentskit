import React from 'react'
import { Box, Text } from 'ink'
import type { Message as MessageType, MessageRole } from '@agentskit/core'
import { MarkdownText } from './MarkdownText'

export interface MessageProps {
  message: MessageType
  /**
   * Render assistant message content as markdown (headings, lists, code,
   * bold, italic, links). Default: `true`. Set to `false` to render as
   * plain text — useful for tool output or raw logs.
   */
  markdown?: boolean
}

const ROLE_META: Record<MessageRole, { icon: string; label: string; color: string }> = {
  user: { icon: '❯', label: 'you', color: 'green' },
  assistant: { icon: '✦', label: 'assistant', color: 'cyan' },
  system: { icon: '◆', label: 'system', color: 'yellow' },
  tool: { icon: '⚙', label: 'tool', color: 'magenta' },
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export function Message({ message, markdown = true }: MessageProps) {
  const meta = ROLE_META[message.role] ?? ROLE_META.assistant
  const isStreaming = message.status === 'streaming'

  // Tool-role messages are raw results passed back to the model; render compact.
  if (message.role === 'tool') {
    return (
      <Box flexDirection="column" marginLeft={2}>
        <Text dimColor>
          <Text color={meta.color}>{meta.icon} </Text>
          tool result
        </Text>
        <Text dimColor>{truncate(message.content, 400)}</Text>
      </Box>
    )
  }

  const shouldRenderMarkdown = markdown && message.role === 'assistant' && !!message.content

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={meta.color} bold>
          {meta.icon} {meta.label}
        </Text>
        {isStreaming ? <Text dimColor>  · streaming</Text> : null}
      </Box>
      {message.content ? (
        shouldRenderMarkdown ? (
          <MarkdownText content={message.content} />
        ) : (
          <Text>{message.content}</Text>
        )
      ) : null}
    </Box>
  )
}
