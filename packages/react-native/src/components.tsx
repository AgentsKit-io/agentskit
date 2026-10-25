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

/** Children and native scroll container settings for a chat layout. */
export interface ChatContainerProps {
  children: ReactNode
  style?: Style
  testID?: string
}

/** Render chat content in an auto-scrolling React Native `ScrollView`.
 * @param props The children and optional style and test identifier.
 * @returns A scroll view that follows content growth.
 * @example
 * ```tsx
 * <ChatContainer><Message message={message} /></ChatContainer>
 * ```
 */
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

/** Message data and native content options for the message view. */
export interface MessageProps {
  message: MessageType
  avatar?: ReactNode
  actions?: ReactNode
  style?: Style
  contentStyle?: Style
  testID?: string
}

/** Render a message with its role and status exposed to accessibility tools.
 * @param props The message and optional avatar, actions, and styles.
 * @returns A native view containing the message content.
 * @example
 * ```tsx
 * <Message message={message} />
 * ```
 */
export function Message({ message, avatar, actions, style, contentStyle, testID = 'ak-message' }: MessageProps) {
  return (
    <View
      testID={testID}
      style={style}
      accessibilityLabel={`${message.role} message (${message.status})`}
    >
      {avatar ? <View testID="ak-avatar">{avatar}</View> : null}
      <Text testID="ak-content" style={contentStyle}>{message.content}</Text>
      {actions ? <View testID="ak-actions">{actions}</View> : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// InputBar — ChatReturn -> TextInput + Pressable "Send".
// onSubmitEditing sends; disabled when empty or streaming.
// ---------------------------------------------------------------------------

/** Chat state and native input options for the message composer. */
export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
  style?: Style
  inputStyle?: Style
  testID?: string
}

/** Render a native input that sends non-empty messages on submit or press.
 * @param props Chat state and optional placeholder, disabled state, and styles.
 * @returns A native text input and send button.
 * @example
 * ```tsx
 * <InputBar chat={chat} placeholder="Ask something…" />
 * ```
 */
export function InputBar({
  chat,
  placeholder = 'Type a message...',
  disabled = false,
  style,
  inputStyle,
  testID = 'ak-input-bar',
}: InputBarProps) {
  const isStreaming = chat.status === 'streaming'
  const canSend = !disabled && !isStreaming && chat.input.trim().length > 0

  const handleSend = useCallback(() => {
    if (disabled || chat.status === 'streaming' || !chat.input.trim()) return
    void chat.send(chat.input)
  }, [chat, disabled])

  return (
    <View testID={testID} style={style}>
      <TextInput
        testID="ak-input"
        style={inputStyle}
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

/** Markdown text and status shown by the native text renderer. */
export interface MarkdownProps {
  content: string
  streaming?: boolean
  style?: Style
  testID?: string
}

/** Render Markdown source as React Native text.
 * @param props Content, streaming status, and optional styles and test ID.
 * @returns A native text element with a streaming accessibility label.
 */
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

/** Code content, copy callback, and native display options. */
export interface CodeBlockProps {
  code: string
  language?: string
  copyable?: boolean
  onCopy?: (code: string) => void
  style?: Style
  testID?: string
}

/** Render code with an optional button that calls `onCopy`.
 * @param props Code, optional language and copy settings, and display options.
 * @returns A native view containing the code and optional copy action.
 */
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

/** Tool call and display options for its native status view. */
export interface ToolCallViewProps {
  toolCall: ToolCall
  style?: Style
  testID?: string
}

/** Render a tool call with a control for expanding its arguments and result.
 * @param props The tool call and optional style and test identifier.
 * @returns A native view showing the tool call and its expandable details.
 */
export function ToolCallView({ toolCall, style, testID = 'ak-tool-call' }: ToolCallViewProps) {
  const [expanded, setExpanded] = useState(false)
  let result: ReactNode = null
  if (toolCall.result) {
    result = <Text testID="ak-tool-result">{toolCall.result}</Text>
  }

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
          {result}
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// ThinkingIndicator — visible + label -> null when !visible.
// ---------------------------------------------------------------------------

/** Visibility, label, and native display options for the thinking indicator. */
export interface ThinkingIndicatorProps {
  visible: boolean
  label?: string
  style?: Style
  testID?: string
}

/** Render a thinking label when visible, or `null` otherwise.
 * @param props Visibility, optional label, style, and test identifier.
 * @returns The native indicator view, or `null` when hidden.
 */
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

/** Pending tool call, approval callbacks, and native display options. */
export interface ToolConfirmationProps {
  toolCall: ToolCall
  onApprove: (toolCallId: string) => void
  onDeny: (toolCallId: string, reason?: string) => void
  style?: Style
  testID?: string
}

/** Render approve and deny actions for a call requiring confirmation.
 * @param props The call, decision callbacks, style, and test identifier.
 * @returns The native confirmation view, or `null` unless confirmation is required.
 */
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
