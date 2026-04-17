import React from 'react'
import { Box, Text } from 'ink'
import type { Message as MessageType, MessageRole, TokenUsage } from '@agentskit/core'
import { MarkdownText } from './MarkdownText'

export interface MessageProps {
  message: MessageType
  /**
   * Render assistant message content as markdown (headings, lists, code,
   * bold, italic, links). Default: `true`. Set to `false` to render as
   * plain text — useful for tool output or raw logs.
   */
  markdown?: boolean
  /**
   * Show inline token usage below assistant messages when the adapter
   * surfaces it (via `message.metadata.usage`). Default: `true`.
   */
  showUsage?: boolean
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}m`
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

export function Message({ message, markdown = true, showUsage = true }: MessageProps) {
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
  const usage = message.metadata?.usage as TokenUsage | undefined
  const shouldRenderUsage =
    showUsage && message.role === 'assistant' && usage && usage.totalTokens > 0

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
      {shouldRenderUsage && usage ? (
        <Box>
          <Text dimColor>tokens  </Text>
          <Text color="green">↑{formatTokens(usage.promptTokens)}</Text>
          <Text dimColor>  </Text>
          <Text color="yellow">↓{formatTokens(usage.completionTokens)}</Text>
          <Text dimColor>  ·  </Text>
          <Text dimColor>{formatTokens(usage.totalTokens)} total</Text>
        </Box>
      ) : null}
    </Box>
  )
}
