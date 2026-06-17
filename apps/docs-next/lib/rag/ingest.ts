/**
 * Build the docs RAG corpus from the fumadocs MDX tree and ingest it.
 *
 * Where the docs live: `apps/docs-next/content/docs/**\/*.{md,mdx}`. This is the
 * same source fumadocs loads via `lib/source.ts` (`content/docs`, baseUrl
 * `/docs`). We enumerate the files directly off disk rather than through the
 * fumadocs loader so this runs in a plain Node script (gen-ask-index.mjs)
 * without booting Next.
 *
 * Chunking strategy: split each page into H2/H3 sections. Each section becomes
 * one (or more) `InputDocument` carrying `{ title, path, anchor, headingPath,
 * order }`. Long sections are sub-split with the package's `chunkText` so no
 * single chunk blows past the embedding context. Page anchors match fumadocs'
 * GitHub-style slugger so citations link to the right heading.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRAG, chunkText, type InputDocument, type RAG } from '@agentskit/rag'
import { fileVectorMemory } from '@agentskit/memory'
import { embed } from './embed'

const __dirname = dirname(fileURLToPath(import.meta.url))
/** apps/docs-next root (lib/rag → ..). */
export const DOCS_APP_ROOT = resolve(__dirname, '..', '..')
/** Root of the fumadocs MDX tree we index. */
export const DOCS_CONTENT_DIR = resolve(DOCS_APP_ROOT, 'content/docs')
/** Default on-disk vector index location (used by the gen script). */
export const ASK_INDEX_DIR = resolve(DOCS_APP_ROOT, 'lib/ask-index')

/** Directories under content/docs we never index (auto-generated / agent-only). */
const SKIP_DIRS = new Set(['api', 'for-agents'])

/** Chunking knobs — section-first, with sub-splitting for long sections. */
export const CHUNK_SIZE = 1200
export const CHUNK_OVERLAP = 150

export interface DocChunkMetadata extends Record<string, unknown> {
  /** Page title (frontmatter `title`). */
  title: string
  /** Site-relative doc path, e.g. `/docs/data/rag/create-rag`. */
  path: string
  /** Heading anchor within the page, e.g. `install`. Empty for the lead section. */
  anchor: string
  /** Breadcrumb of headings down to this section, e.g. `Install > Node`. */
  headingPath: string
  /** Stable order of this section within the page (0 = lead). */
  order: number
}

interface Section {
  /** Heading text ('' for the page-lead section above the first H2). */
  heading: string
  /** 2 for H2, 3 for H3, 0 for the lead. */
  level: number
  anchor: string
  headingPath: string
  order: number
  body: string
}

/** Recursively collect .md/.mdx files under `dir`, honoring SKIP_DIRS. */
function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      out.push(...walk(join(dir, entry.name)))
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

/** GitHub-style heading slug — matches fumadocs' default rehype-slug output. */
function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** content/docs/data/rag/create-rag.mdx → /docs/data/rag/create-rag */
function fileToDocPath(file: string): string {
  const slug = relative(DOCS_CONTENT_DIR, file)
    .replace(/\\/g, '/')
    .replace(/\.(mdx|md)$/, '')
    .replace(/\/index$/, '')
  return slug ? `/docs/${slug}` : '/docs'
}

/** Parse frontmatter `title`; strip the frontmatter block from the body. */
function parseFrontmatter(raw: string): { title?: string; body: string } {
  const fm = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!fm) return { body: raw }
  const title = fm[1]
    .match(/^title:\s*(.+)$/m)?.[1]
    ?.replace(/^['"]|['"]$/g, '')
    .trim()
  return { title, body: raw.slice(fm[0].length) }
}

/**
 * Split a page body into H2/H3 sections. The text before the first heading is
 * the "lead" section (order 0, no anchor). H3s nest under the nearest H2 for
 * the `headingPath` breadcrumb.
 */
function splitSections(body: string): Section[] {
  const lines = body.split('\n')
  const sections: Section[] = []
  let order = 0
  let currentH2 = ''
  let current: Section = {
    heading: '',
    level: 0,
    anchor: '',
    headingPath: '',
    order: order++,
    body: '',
  }
  let inFence = false

  const push = () => {
    if (current.body.trim().length > 0 || current.heading) sections.push(current)
  }

  for (const line of lines) {
    // Track fenced code blocks so `## ` inside a ``` block isn't a heading.
    if (/^\s*```/.test(line)) inFence = !inFence

    const h = inFence ? null : line.match(/^(#{2,3})\s+(.+?)\s*#*$/)
    if (h) {
      push()
      const level = h[1].length
      const heading = h[2].trim().replace(/`/g, '')
      if (level === 2) currentH2 = heading
      const headingPath =
        level === 3 && currentH2 ? `${currentH2} > ${heading}` : heading
      current = {
        heading,
        level,
        anchor: slugify(heading),
        headingPath,
        order: order++,
        body: '',
      }
    } else {
      current.body += `${line}\n`
    }
  }
  push()
  return sections
}

/** Strip noisy MDX/Markdown syntax so embeddings see prose, not markup. */
function cleanText(text: string): string {
  return text
    .replace(/^import\s.+$/gm, '')
    .replace(/^export\s.+$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Build the full `InputDocument[]` corpus from the on-disk MDX tree. */
export function collectDocInputs(): InputDocument[] {
  const inputs: InputDocument[] = []

  for (const file of walk(DOCS_CONTENT_DIR)) {
    const raw = readFileSync(file, 'utf8')
    const { title, body } = parseFrontmatter(raw)
    if (!title) continue
    const path = fileToDocPath(file)

    for (const section of splitSections(body)) {
      const sectionText = cleanText(section.body)
      if (sectionText.length === 0) continue

      // Prefix each chunk with the heading trail so the embedding (and the
      // model reading the cited context) has the page/section in scope.
      const header = section.headingPath
        ? `${title} — ${section.headingPath}`
        : title
      const subChunks = chunkText(sectionText, {
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      })

      subChunks.forEach((chunk, i) => {
        const metadata: DocChunkMetadata = {
          title,
          path,
          anchor: section.anchor,
          headingPath: section.headingPath,
          order: section.order,
        }
        inputs.push({
          id: `${path}#${section.anchor || 'lead'}-${i}`,
          content: `${header}\n\n${chunk}`,
          source: section.anchor ? `${path}#${section.anchor}` : path,
          metadata,
        })
      })
    }
  }

  inputs.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  return inputs
}

export interface IngestDocsOptions {
  /** Vector index directory. Defaults to `lib/ask-index/`. */
  indexDir?: string
}

export interface IngestDocsResult {
  rag: RAG
  inputs: InputDocument[]
  indexDir: string
}

/**
 * Build a `createRAG` instance backed by `fileVectorMemory`, ingest the docs
 * corpus into it, and return the RAG plus the raw inputs. The committed
 * snapshot script (gen-ask-index.mjs) calls this, then serializes the vectors.
 */
export async function ingestDocs(options: IngestDocsOptions = {}): Promise<IngestDocsResult> {
  const indexDir = options.indexDir ?? ASK_INDEX_DIR
  const store = fileVectorMemory({ path: indexDir })
  const rag = createRAG({
    embed,
    store,
    // Sections are pre-chunked in collectDocInputs(); keep RAG's own splitter
    // off by handing it whole chunks (size large enough to pass through).
    chunkSize: CHUNK_SIZE * 4,
    chunkOverlap: 0,
    topK: 8,
  })

  const inputs = collectDocInputs()
  await rag.ingest(inputs)
  return { rag, inputs, indexDir }
}
