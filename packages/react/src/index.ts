/**
 * Create the shared imperative controller used by framework bindings.
 *
 * @param initial The chat configuration for the controller.
 * @returns A controller with chat state, subscriptions, and actions.
 */
export { createChatController } from '@agentskit/core'

/**
 * Create an in-memory chat message store initialized with optional messages.
 *
 * @param initialMessages Messages to seed the store with.
 * @returns A `ChatMemory` implementation that keeps data in memory.
 */
export { createInMemoryMemory } from '@agentskit/core'

/**
 * Create a browser-local-storage backend for chat messages.
 *
 * @param key The storage key used for the serialized message record.
 * @returns A `ChatMemory` implementation backed by `localStorage` when available.
 */
export { createLocalStorageMemory } from '@agentskit/core'

/**
 * Create a retriever that ranks a fixed document set against query terms.
 *
 * @param config The documents and optional maximum result count.
 * @returns A retriever that returns matching documents in score order.
 */
export { createStaticRetriever } from '@agentskit/core'

/**
 * Format retrieved documents as numbered text blocks.
 *
 * @param documents The documents to format.
 * @returns Numbered document text, or an empty string when the input is empty.
 */
export { formatRetrievedDocuments } from '@agentskit/core'

/** A synchronous value or promise accepted by controller extension points. */
export type { MaybePromise } from '@agentskit/core'
/** The current state of a streamed response. */
export type { StreamStatus } from '@agentskit/core'
/** The role assigned to a chat message. */
export type { MessageRole } from '@agentskit/core'
/** The lifecycle status of a chat message. */
export type { MessageStatus } from '@agentskit/core'
/** The core message shape re-exported under a React-friendly name. */
export type { Message as MessageType } from '@agentskit/core'
/** The lifecycle or confirmation status of a tool call. */
export type { ToolCallStatus } from '@agentskit/core'
/** A tool call and its arguments, result, error, and status. */
export type { ToolCall } from '@agentskit/core'
/** A document returned by a retriever, including optional metadata and score. */
export type { RetrievedDocument } from '@agentskit/core'
/** The streamed tool-call fields emitted by an adapter. */
export type { StreamToolCallPayload } from '@agentskit/core'
/** One text, tool, usage, reasoning, error, or completion event in a stream. */
export type { StreamChunk } from '@agentskit/core'
/** An async stream source with an abort operation. */
export type { StreamSource } from '@agentskit/core'
/** Callbacks for observing chunks and stream completion or errors. */
export type { UseStreamOptions } from '@agentskit/core'
/** The accumulated data and controls returned by `useStream`. */
export type { UseStreamReturn } from '@agentskit/core'
/** Message and tool-call context passed to a tool execution function. */
export type { ToolExecutionContext } from '@agentskit/core'
/** The schema, lifecycle, and execution contract for a tool. */
export type { ToolDefinition } from '@agentskit/core'
/** Message and optional tool context supplied to a tool-call handler. */
export type { ToolCallHandlerContext } from '@agentskit/core'
/** Storage interface for loading, saving, and optionally clearing messages. */
export type { ChatMemory } from '@agentskit/core'
/** The message query and history supplied to a retriever. */
export type { RetrieverRequest } from '@agentskit/core'
/** A synchronous or asynchronous interface for retrieving documents. */
export type { Retriever } from '@agentskit/core'
/** Optional model settings and tools supplied to an adapter request. */
export type { AdapterContext } from '@agentskit/core'
/** The messages and optional context passed from a controller to an adapter. */
export type { AdapterRequest } from '@agentskit/core'
/** Configuration for the chat controller and its integrations. */
export type { ChatConfig } from '@agentskit/core'
/** Current messages, stream status, input, error, and token usage. */
export type { ChatState } from '@agentskit/core'
/** The imperative chat state, subscription, and action interface. */
export type { ChatController } from '@agentskit/core'
/** Chat state and actions exposed to framework consumers. */
export type { ChatReturn } from '@agentskit/core'
/** Versioned serialized chat messages with string timestamps. */
export type { MemoryRecord } from '@agentskit/core'
/** The function that creates a stream source from an adapter request. */
export type { AdapterFactory } from '@agentskit/core'

export { useStream } from './useStream'
export { useReactive } from './useReactive'
export { useChat } from './useChat'

export {
  ChatContainer,
  Message,
  InputBar,
  Markdown,
  CodeBlock,
  ToolCallView,
  ThinkingIndicator,
  ToolConfirmation,
  TopologyGraphView,
} from './components'

export type {
  ChatContainerProps,
  MessageProps,
  InputBarProps,
  MarkdownProps,
  CodeBlockProps,
  ToolCallViewProps,
  ThinkingIndicatorProps,
  ToolConfirmationProps,
  TopologyGraphViewProps,
  TopologyGraphViewNode,
  TopologyGraphViewEdge,
  TopologyGraphViewSnapshot,
  TopologyGraphSource,
} from './components'
