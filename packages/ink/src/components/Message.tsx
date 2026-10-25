import React from 'react'
import { Box, Text } from 'ink'
import type { Message as MessageType, TokenUsage } from '@agentskit/core'
import { MarkdownText } from './MarkdownText'
import { useInkTheme } from './theme'

/** Message content and display options for the terminal message view. */
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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

/** Render a chat message with role styling and optional markdown and usage.
 * @param props The message and display options.
 * @returns The terminal representation of the message.
 * @example
 * ```tsx
 * <Message message={message} markdown showUsage />
 * ```
 */
export function Message({ message, markdown = true, showUsage = true }: MessageProps) {
  const theme = useInkTheme()
  const meta = theme.roles[message.role] ?? theme.roles.assistant
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
  let messageContent: React.ReactNode = null
  if (message.content) {
    if (shouldRenderMarkdown) {
      messageContent = <MarkdownText content={message.content} />
    } else {
      messageContent = <Text>{message.content}</Text>
    }
  }
  let usageContent: React.ReactNode = null
  if (shouldRenderUsage && usage) {
    usageContent = (
      <Box>
        <Text dimColor>tokens  </Text>
        <Text color={theme.usage.prompt}>↑{formatTokens(usage.promptTokens)}</Text>
        <Text dimColor>  </Text>
        <Text color={theme.usage.completion}>↓{formatTokens(usage.completionTokens)}</Text>
        <Text dimColor>  ·  </Text>
        <Text dimColor>{formatTokens(usage.totalTokens)} total</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={meta.color} bold>
          {meta.icon} {meta.label}
        </Text>
        {isStreaming ? <Text dimColor>  · streaming</Text> : null}
      </Box>
      {messageContent}
      {usageContent}
    </Box>
  )
}
