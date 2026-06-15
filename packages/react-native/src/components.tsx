import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import type { Message as MessageType, ChatReturn, ToolCall } from '@agentskit/core'

/**
 * Headless React Native chat components — RN-primitive mirror of the
 * `@agentskit/react` headless contract.
 *
 * React Native has no DOM, so there are no `data-ak-*` attributes. The
 * web-parity story is carried by `testID` props (`ak-message`, `ak-input`,
 * etc.): the same stable hooks AI-generated UIs and tests target on the web,
 * surfaced through RN's native `testID` (Appium / e2e) instead. Role and
 * status are conveyed via `accessibilityLabel`. No `StyleSheet`/colors are
 * hardcoded — consumers style through the optional `style` pass-through where
 * a host primitive accepts it.
 */

// Minimal structural style type — avoids depending on react-native's
// StyleProp/ViewStyle types at the surface (kept peer/external).
type Style = Record<string, unknown> | Array<Record<string, unknown>> | undefined

// ---------------------------------------------------------------------------
// ChatContainer — ScrollView wrapper + children + auto-scroll to end.
// ---------------------------------------------------------------------------

export interface ChatContainerProps {
  children: ReactNode
  style?: Style
  testID?: string
}

export function ChatContainer({ children, style, testID = 'ak-chat-container' }: ChatContainerProps) {
  const scrollRef = useRef<ScrollView>(null)

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd?.({ animated: true })
  }, [])

  useEffect(() => {
    scrollToEnd()
  }, [children, scrollToEnd])

  return (
    <ScrollView
      ref={scrollRef}
      testID={testID}
      style={style}
      onContentSizeChange={scrollToEnd}
    >
      {children}
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// Message — message prop -> View + Text. Role/status via accessibilityLabel.
// ---------------------------------------------------------------------------

export interface MessageProps {
  message: MessageType
  avatar?: ReactNode
  actions?: ReactNode
  style?: Style
  testID?: string
}

export function Message({ message, avatar, actions, style, testID = 'ak-message' }: MessageProps) {
  return (
    <View
      testID={testID}
      style={style}
      accessibilityLabel={`${message.role} message (${message.status})`}
    >
      {avatar ? <View testID="ak-avatar">{avatar}</View> : null}
      <Text testID="ak-content">{message.content}</Text>
      {actions ? <View testID="ak-actions">{actions}</View> : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// InputBar — ChatReturn -> TextInput + Pressable "Send".
// onSubmitEditing sends; disabled when empty or streaming.
// ---------------------------------------------------------------------------

export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
  style?: Style
  testID?: string
}

export function InputBar({
  chat,
  placeholder = 'Type a message...',
  disabled = false,
  style,
  testID = 'ak-input-bar',
}: InputBarProps) {
  const isStreaming = chat.status === 'streaming'
  const canSend = !disabled && !isStreaming && chat.input.trim().length > 0

  const handleSend = useCallback(() => {
    if (chat.input.trim()) {
      chat.send(chat.input)
    }
  }, [chat])

  return (
    <View testID={testID} style={style}>
      <TextInput
        testID="ak-input"
        value={chat.input}
        onChangeText={chat.setInput}
        onSubmitEditing={handleSend}
        placeholder={placeholder}
        editable={!disabled && !isStreaming}
        accessibilityLabel="Message input"
      />
      <Pressable
        testID="ak-send"
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
      >
        <Text>Send</Text>
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Markdown — content + streaming -> Text (no DOM renderer on RN).
// ---------------------------------------------------------------------------

export interface MarkdownProps {
  content: string
  streaming?: boolean
  style?: Style
  testID?: string
}

export function Markdown({ content, streaming = false, style, testID = 'ak-markdown' }: MarkdownProps) {
  return (
    <Text
      testID={testID}
      style={style}
      accessibilityLabel={streaming ? 'streaming markdown' : 'markdown'}
    >
      {content}
    </Text>
  )
}

// ---------------------------------------------------------------------------
// CodeBlock — code + language + copyable -> View + Text + optional copy.
// ---------------------------------------------------------------------------

export interface CodeBlockProps {
  code: string
  language?: string
  copyable?: boolean
  onCopy?: (code: string) => void
  style?: Style
  testID?: string
}

export function CodeBlock({
  code,
  language,
  copyable = false,
  onCopy,
  style,
  testID = 'ak-code-block',
}: CodeBlockProps) {
  const handleCopy = useCallback(() => {
    onCopy?.(code)
  }, [onCopy, code])

  return (
    <View
      testID={testID}
      style={style}
      accessibilityLabel={language ? `code block (${language})` : 'code block'}
    >
      <Text testID="ak-code">{code}</Text>
      {copyable ? (
        <Pressable
          testID="ak-copy"
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel="Copy code"
        >
          <Text>Copy</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// ToolCallView — toolCall; useState expanded; Pressable toggle.
// ---------------------------------------------------------------------------

export interface ToolCallViewProps {
  toolCall: ToolCall
  style?: Style
  testID?: string
}

export function ToolCallView({ toolCall, style, testID = 'ak-tool-call' }: ToolCallViewProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <View
      testID={testID}
      style={style}
      accessibilityLabel={`tool ${toolCall.name} (${toolCall.status})`}
    >
      <Pressable
        testID="ak-tool-toggle"
        onPress={() => setExpanded(prev => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text>{toolCall.name}</Text>
      </Pressable>
      {expanded ? (
        <View testID="ak-tool-details">
          <Text testID="ak-tool-args">{JSON.stringify(toolCall.args, null, 2)}</Text>
          {toolCall.result ? <Text testID="ak-tool-result">{toolCall.result}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// ThinkingIndicator — visible + label -> null when !visible.
// ---------------------------------------------------------------------------

export interface ThinkingIndicatorProps {
  visible: boolean
  label?: string
  style?: Style
  testID?: string
}

export function ThinkingIndicator({
  visible,
  label = 'Thinking...',
  style,
  testID = 'ak-thinking',
}: ThinkingIndicatorProps) {
  if (!visible) return null

  return (
    <View testID={testID} style={style} accessibilityLabel={label}>
      <Text testID="ak-thinking-label">{label}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// ToolConfirmation — toolCall + onApprove + onDeny.
// null unless status === 'requires_confirmation'.
// ---------------------------------------------------------------------------

export interface ToolConfirmationProps {
  toolCall: ToolCall
  onApprove: (toolCallId: string) => void
  onDeny: (toolCallId: string, reason?: string) => void
  style?: Style
  testID?: string
}

export function ToolConfirmation({
  toolCall,
  onApprove,
  onDeny,
  style,
  testID = 'ak-tool-confirmation',
}: ToolConfirmationProps) {
  if (toolCall.status !== 'requires_confirmation') return null

  return (
    <View
      testID={testID}
      style={style}
      accessibilityLabel={`${toolCall.name} requires confirmation`}
    >
      <View testID="ak-tool-confirmation-header">
        <Text testID="ak-tool-confirmation-name">{toolCall.name}</Text>
        <Text testID="ak-tool-confirmation-status">requires confirmation</Text>
      </View>
      <Text testID="ak-tool-confirmation-args">{JSON.stringify(toolCall.args, null, 2)}</Text>
      <View testID="ak-tool-confirmation-actions">
        <Pressable
          testID="ak-tool-confirmation-approve"
          onPress={() => onApprove(toolCall.id)}
          accessibilityRole="button"
          accessibilityLabel="Approve tool call"
        >
          <Text>Approve</Text>
        </Pressable>
        <Pressable
          testID="ak-tool-confirmation-deny"
          onPress={() => onDeny(toolCall.id)}
          accessibilityRole="button"
          accessibilityLabel="Deny tool call"
        >
          <Text>Deny</Text>
        </Pressable>
      </View>
    </View>
  )
}
