export { createChatStore } from './useChat'

export type { SvelteChatStore } from './useChat'

/** A scrollable chat region that follows changes to its rendered content. */
export { default as ChatContainer } from './components/ChatContainer.svelte'
/** Render a chat message with optional avatar and action snippets. */
export { default as Message } from './components/Message.svelte'
/** Render a chat textarea and submit control bound to a Svelte chat store. */
export { default as InputBar } from './components/InputBar.svelte'
/** Display chat content with an optional streaming marker. */
export { default as Markdown } from './components/Markdown.svelte'
/** Render a code block and optionally expose a clipboard copy button. */
export { default as CodeBlock } from './components/CodeBlock.svelte'
/** Show a tool call summary with expandable arguments and result details. */
export { default as ToolCallView } from './components/ToolCallView.svelte'
/** Show a labeled thinking indicator when `visible` is true. */
export { default as ThinkingIndicator } from './components/ThinkingIndicator.svelte'
/** Show approval controls while a tool call requires confirmation. */
export { default as ToolConfirmation } from './components/ToolConfirmation.svelte'
