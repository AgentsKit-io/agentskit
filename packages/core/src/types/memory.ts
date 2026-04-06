import type { MaybePromise } from './common'
import type { Message } from './message'
import type { RetrievedDocument } from './retrieval'

export interface ChatMemory {
  load: () => MaybePromise<Message[]>
  save: (messages: Message[]) => MaybePromise<void>
  clear?: () => MaybePromise<void>
}

export interface VectorDocument {
  id: string
  content: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

export interface VectorMemory {
  store: (docs: VectorDocument[]) => MaybePromise<void>
  search: (
    embedding: number[],
    options?: { topK?: number; threshold?: number },
  ) => MaybePromise<RetrievedDocument[]>
  delete?: (ids: string[]) => MaybePromise<void>
}

export type EmbedFn = (text: string) => Promise<number[]>
