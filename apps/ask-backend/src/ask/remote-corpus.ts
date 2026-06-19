import type { RetrievedDocument, Retriever } from '@agentskit/core'
import { bm25Score } from '@agentskit/rag'

interface RemoteCorpusSource {
  title: string
  url: string
}

export interface RemoteCorpusRetrieverOptions {
  id: string
  title: string
  sources: RemoteCorpusSource[]
  timeoutMs?: number
  maxContextChars?: number
  topK?: number
}

const DEFAULT_TIMEOUT_MS = 5_000
const DEFAULT_MAX_CONTEXT_CHARS = 12_000
const DEFAULT_TOP_K = 6
const MAX_CHUNK_CHARS = 4_000

async function fetchText(source: RemoteCorpusSource, timeoutMs: number): Promise<string | undefined> {
  const res = await fetch(source.url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'text/plain, text/markdown;q=0.9, */*;q=0.1' },
  })
  if (!res.ok) return undefined
  const text = await res.text()
  return text.trim() ? text : undefined
}

function compactWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim()
}

function chunkMarkdown(source: RemoteCorpusSource, corpusTitle: string, text: string): RetrievedDocument[] {
  const normalized = compactWhitespace(text)
  const sections = normalized.split(/\n(?=#{1,3}\s+)/g).filter(Boolean)
  const chunks: RetrievedDocument[] = []

  for (const [sectionIndex, section] of sections.entries()) {
    const title = section.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim() ?? source.title
    for (let offset = 0; offset < section.length; offset += MAX_CHUNK_CHARS) {
      const content = section.slice(offset, offset + MAX_CHUNK_CHARS).trim()
      if (!content) continue
      chunks.push({
        id: `${source.url}#${sectionIndex}-${offset}`,
        source: source.url,
        content: `${corpusTitle} - ${title}\n\nSource: ${source.url}\n\n${content}`,
        metadata: {
          title,
          path: source.url,
          sourceTitle: source.title,
        },
      })
    }
  }

  return chunks
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function jsonRegistryDocuments(source: RemoteCorpusSource, corpusTitle: string, text: string): RetrievedDocument[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }

  const records = isRecord(parsed) && Array.isArray(parsed.agents) ? parsed.agents : Array.isArray(parsed) ? parsed : []
  return records.filter(isRecord).map((record, index) => {
    const id = stringField(record, 'id') ?? `${source.url}#${index}`
    const title = stringField(record, 'title') ?? id
    const description = stringField(record, 'description') ?? ''
    const category = stringField(record, 'category')
    const version = stringField(record, 'version')
    const sourceName = stringField(record, 'source')
    const tags = stringArrayField(record, 'tags')
    const packages = stringArrayField(record, 'packages')
    const content = [
      `${corpusTitle} - ${title}`,
      '',
      description,
      category ? `Category: ${category}` : undefined,
      version ? `Version: ${version}` : undefined,
      sourceName ? `Source: ${sourceName}` : undefined,
      tags.length > 0 ? `Tags: ${tags.join(', ')}` : undefined,
      packages.length > 0 ? `Packages: ${packages.join(', ')}` : undefined,
    ]
      .filter((line): line is string => typeof line === 'string')
      .join('\n')

    return {
      id,
      source: source.url,
      content,
      metadata: {
        title,
        path: source.url,
        sourceTitle: source.title,
        category,
      },
    }
  })
}

function chunkSource(source: RemoteCorpusSource, corpusTitle: string, text: string): RetrievedDocument[] {
  const jsonDocs = jsonRegistryDocuments(source, corpusTitle, text)
  return jsonDocs.length > 0 ? jsonDocs : chunkMarkdown(source, corpusTitle, text)
}

function boundByChars(docs: RetrievedDocument[], maxChars: number): RetrievedDocument[] {
  const out: RetrievedDocument[] = []
  let used = 0
  for (const d of docs) {
    const len = d.content.length
    if (out.length > 0 && used + len > maxChars) break
    out.push(d)
    used += len
  }
  return out
}

export function createRemoteCorpusRetriever(options: RemoteCorpusRetrieverOptions): Retriever {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxContextChars = options.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS
  const topK = options.topK ?? DEFAULT_TOP_K
  let documentsPromise: Promise<RetrievedDocument[]> | undefined

  async function loadDocuments(): Promise<RetrievedDocument[]> {
    if (documentsPromise) return documentsPromise
    documentsPromise = (async () => {
      const documents: RetrievedDocument[] = []
      for (const source of options.sources) {
        try {
          const text = await fetchText(source, timeoutMs)
          if (text) documents.push(...chunkSource(source, options.title, text))
        } catch (err) {
          console.warn('[ask-backend] remote corpus source failed', {
            corpus: options.id,
            url: source.url,
            cause: err instanceof Error ? err.message : String(err),
          })
        }
      }
      if (documents.length === 0) {
        console.warn('[ask-backend] remote corpus loaded no documents', { corpus: options.id })
      }
      return documents
    })()
    return documentsPromise
  }

  return {
    async retrieve(request) {
      const documents = await loadDocuments()
      const ranked = bm25Score(request.query, documents)
        .filter((doc) => (doc.score ?? 0) > 0)
        .slice(0, topK)
      return boundByChars(ranked, maxContextChars)
    },
  }
}
