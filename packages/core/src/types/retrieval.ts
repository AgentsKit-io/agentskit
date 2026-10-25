import type { MaybePromise } from './common'
import type { Message } from './message'

/** Document returned by a retriever for a query. */
export interface RetrievedDocument {
  id: string
  content: string
  source?: string
  score?: number
  metadata?: Record<string, unknown>
}

/** Query and conversation context supplied to a retriever. */
export interface RetrieverRequest {
  query: string
  messages: Message[]
}

/** Retrieval contract used to add relevant documents to a chat request. */
export interface Retriever {
  retrieve: (request: RetrieverRequest) => MaybePromise<RetrievedDocument[]>
}
