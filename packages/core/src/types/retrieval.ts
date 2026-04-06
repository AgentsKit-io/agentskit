import type { MaybePromise } from './common'
import type { Message } from './message'

export interface RetrievedDocument {
  id: string
  content: string
  source?: string
  score?: number
  metadata?: Record<string, unknown>
}

export interface RetrieverRequest {
  query: string
  messages: Message[]
}

export interface Retriever {
  retrieve: (request: RetrieverRequest) => MaybePromise<RetrievedDocument[]>
}
