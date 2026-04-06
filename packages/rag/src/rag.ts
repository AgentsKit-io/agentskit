import { generateId } from '@agentskit/core'
import type { RetrievedDocument, RetrieverRequest, VectorDocument } from '@agentskit/core'
import type { InputDocument, RAG, RAGConfig } from './types'
import { chunkText } from './chunker'

export function createRAG(config: RAGConfig): RAG {
  const {
    embed,
    store,
    chunkSize = 512,
    chunkOverlap = 50,
    split,
    topK = 5,
    threshold = 0,
  } = config

  async function ingest(documents: InputDocument[]): Promise<void> {
    const vectorDocs: VectorDocument[] = []

    for (const doc of documents) {
      const docId = doc.id ?? generateId('doc')
      const chunks = chunkText(doc.content, { chunkSize, chunkOverlap, split })

      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${docId}_chunk_${i}`
        const embedding = await embed(chunks[i])

        vectorDocs.push({
          id: chunkId,
          content: chunks[i],
          embedding,
          metadata: {
            ...doc.metadata,
            source: doc.source,
            documentId: docId,
            chunkIndex: i,
          },
        })
      }
    }

    if (vectorDocs.length > 0) {
      await store.store(vectorDocs)
    }
  }

  async function search(
    query: string,
    options?: { topK?: number; threshold?: number },
  ): Promise<RetrievedDocument[]> {
    const queryEmbedding = await embed(query)
    return store.search(queryEmbedding, {
      topK: options?.topK ?? topK,
      threshold: options?.threshold ?? threshold,
    })
  }

  async function retrieve(request: RetrieverRequest): Promise<RetrievedDocument[]> {
    return search(request.query)
  }

  return { ingest, retrieve, search }
}
