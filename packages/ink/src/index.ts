/** Create the imperative chat controller shared by framework bindings.
 * @param initial The chat configuration for the controller.
 * @returns A controller with chat state, subscriptions, and actions.
 */
export { createChatController } from '@agentskit/core'
/** Create an in-memory message store, optionally seeded with messages.
 * @param initialMessages Messages to place in the store initially.
 * @returns A memory implementation backed by the current process.
 */
export { createInMemoryMemory } from '@agentskit/core'
/** Create a browser local-storage message store.
 * @param key The storage key for the serialized record.
 * @returns A memory implementation backed by local storage when available.
 */
export { createLocalStorageMemory } from '@agentskit/core'
/** Create a retriever over a fixed set of documents.
 * @param config Documents and optional result limit.
 * @returns A retriever that ranks matching documents.
 */
export { createStaticRetriever } from '@agentskit/core'
/** Format retrieved documents as numbered text blocks.
 * @param documents Documents to format.
 * @returns Numbered text, or an empty string when there are no documents.
 */
export { formatRetrievedDocuments } from '@agentskit/core'

/** Optional value that may be returned synchronously or by a promise. */
export type { MaybePromise } from '@agentskit/core'
/** Stream lifecycle state reported by the chat controller. */
export type { StreamStatus } from '@agentskit/core'
/** Role associated with a chat message. */
export type { MessageRole } from '@agentskit/core'
/** Lifecycle status associated with a chat message. */
export type { MessageStatus } from '@agentskit/core'
/** Lifecycle or confirmation status of a tool call. */
export type { ToolCallStatus } from '@agentskit/core'
/** Tool invocation data, including its arguments, result, and status. */
export type { ToolCall } from '@agentskit/core'
/** Document returned by a retriever, with optional metadata and score. */
export type { RetrievedDocument } from '@agentskit/core'
/** Core chat message shape exported with a package-friendly name. */
export type { Message as MessageType } from '@agentskit/core'
/** Tool-call fields emitted as part of a stream chunk. */
export type { StreamToolCallPayload } from '@agentskit/core'
/** One event emitted by an adapter stream. */
export type { StreamChunk } from '@agentskit/core'
/** Async iterable stream of chat chunks with an abort operation. */
export type { StreamSource } from '@agentskit/core'
/** Callbacks for observing stream chunks, completion, and errors. */
export type { UseStreamOptions } from '@agentskit/core'
/** Stream state and stop action returned by a stream hook. */
export type { UseStreamReturn } from '@agentskit/core'
/** Context supplied to a tool implementation during execution. */
export type { ToolExecutionContext } from '@agentskit/core'
/** Definition and execution contract for a tool. */
export type { ToolDefinition } from '@agentskit/core'
/** Message and optional tool context supplied to a tool-call handler. */
export type { ToolCallHandlerContext } from '@agentskit/core'
/** Interface for loading and saving chat messages. */
export type { ChatMemory } from '@agentskit/core'
/** Messages and query passed to a document retriever. */
export type { RetrieverRequest } from '@agentskit/core'
/** Sync or async interface for retrieving documents. */
export type { Retriever } from '@agentskit/core'
/** Optional model settings and tools for an adapter request. */
export type { AdapterContext } from '@agentskit/core'
/** Messages and context passed from the controller to an adapter. */
export type { AdapterRequest } from '@agentskit/core'
/** Configuration for a chat controller and its integrations. */
export type { ChatConfig } from '@agentskit/core'
/** Current chat messages, input, stream status, error, and usage. */
export type { ChatState } from '@agentskit/core'
/** Imperative chat state, subscription, and action interface. */
export type { ChatController } from '@agentskit/core'
/** Chat state and actions returned by a framework binding. */
export type { ChatReturn } from '@agentskit/core'
/** Versioned serialized messages with string timestamps. */
export type { MemoryRecord } from '@agentskit/core'
/** Factory that creates a stream source from an adapter request. */
export type { AdapterFactory } from '@agentskit/core'

/** Bind the core chat controller to React state for Ink components.
 * @param config Controller and adapter configuration.
 * @returns The current chat state and controller actions.
 * @example
 * ```tsx
 * const chat = useChat({ adapter })
 * return <InputBar chat={chat} />
 * ```
 */
export { useChat } from './useChat'

/** Create a progress observer that writes status events to a terminal.
 * @param options Optional output callback and plain-output setting.
 * @returns A terminal progress observer.
 */
export { createProgressObserver } from './progress-observer'
/** Braille spinner frames shared with terminal progress indicators. */
export { SPINNER_FRAMES } from './progress-observer'
/** Output and animation options for the standalone progress observer. */
export type { ProgressObserverOptions } from './progress-observer'

export {
  ChatContainer,
  Message,
  InputBar,
  ToolCallView,
  ThinkingIndicator,
  StatusHeader,
  MarkdownText,
  ToolConfirmation,
  TopologyGraphView,
  InkThemeProvider,
  useInkTheme,
  defaultInkTheme,
} from './components'

export type {
  ChatContainerProps,
  MessageProps,
  InputBarProps,
  ToolCallViewProps,
  ThinkingIndicatorProps,
  StatusHeaderProps,
  MarkdownTextProps,
  ToolConfirmationProps,
  TopologyGraphViewProps,
  TopologyGraphViewNode,
  TopologyGraphViewEdge,
  TopologyGraphViewSnapshot,
  TopologyGraphSource,
  InkTheme,
} from './components'
