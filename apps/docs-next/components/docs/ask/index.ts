export { Markdown } from './Markdown'
export type { MarkdownProps } from './Markdown'
export { CodeBlock } from './CodeBlock'
export type { CodeBlockProps } from './CodeBlock'
export { highlight, getHighlighter, SHIKI_THEMES, SHIKI_LANGS } from './highlighter'

// Generative-UI chat: hook + allow-listed registry render boundary.
export {
  useAskChat,
  type UseAskChat,
  type UseAskChatOptions,
  type ChatMessage,
  type UserMessage,
  type AssistantMessage,
  type AssistantPart,
} from './useAskChat'
export {
  createRegistry,
  defineUITool,
  defaultRegistry,
  DEFAULT_UI_TOOLS,
  type UiTool,
  type UiToolContext,
  type UiToolProps,
  type UiToolRegistry,
} from './registry'
