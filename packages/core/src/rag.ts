import type { RetrievedDocument, Retriever, RetrieverRequest } from './types'

export interface StaticRetrieverConfig {
  documents: RetrievedDocument[]
  limit?: number
}

function scoreDocument(document: RetrievedDocument, query: string): number {
  const haystack = `${document.content} ${document.source ?? ''}`.toLowerCase()
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0

  return tokens.reduce((score, token) => (
    haystack.includes(token) ? score + 1 : score
  ), 0)
}

/** Create a retriever that returns configured documents for each query.
 * @param config Documents to expose through the retriever.
 * @returns A retriever that returns the configured documents.
 */
export function createStaticRetriever(config: StaticRetrieverConfig): Retriever {
  const { documents, limit = 4 } = config

  return {
    async retrieve(request: RetrieverRequest) {
      return [...documents]
        .map(document => ({
          ...document,
          score: document.score ?? scoreDocument(document, request.query),
        }))
        .filter(document => (document.score ?? 0) > 0)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, limit)
    },
  }
}

/** Format retrieved documents into text suitable for a model prompt.
 * @param documents Retrieved content and metadata to format.
 * @returns A labeled text block containing the document contents.
 */
export function formatRetrievedDocuments(documents: RetrievedDocument[]): string {
  if (documents.length === 0) return ''

  return documents
    .map((document, index) => {
      const source = document.source ? `Source: ${document.source}\n` : ''
      return `[${index + 1}]\n${source}${document.content}`
    })
    .join('\n\n')
}
