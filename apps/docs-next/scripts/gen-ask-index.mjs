#!/usr/bin/env node
/**
 * Generate the committed docs RAG index for the Ask-the-docs chat.
 *
 * Mirrors the committed-snapshot pattern (scripts/gen-ask-context.mjs,
 * gen-ecosystem-stats.mjs): build an artifact at prebuild, commit it, and load
 * it at runtime so the serverless route never re-embeds the whole corpus.
 *
 * Output: apps/docs-next/lib/ask-index/index.json — an array of
 *   { id, content, embedding (384-d), metadata: { title, path, anchor,
 *     headingPath, order } }
 * plus a small header (model, dim, count). The retriever (lib/rag/retrieve.ts)
 * reads this directly and runs cosine search in-process — no vectra binary, no
 * writable FS required at query time.
 *
 * We import the TS helpers via tsx/ts-node-less dynamic import is avoided: this
 * script is ESM and imports the compiled-on-the-fly TS through Node's loader is
 * not guaranteed, so it re-implements the thin enumeration by importing the
 * built helpers. To keep a single source of truth we import the source modules
 * with a `.ts`-aware runner (the repo runs scripts with `node` after build, and
 * these lib modules are plain TS with no Next-only imports). If your runner
 * cannot import .ts, run via `tsx scripts/gen-ask-index.mjs`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(APP_ROOT, 'lib/ask-index')
const OUT_FILE = resolve(OUT_DIR, 'index.json')

async function importLib(rel) {
  // Allow `node` (with --experimental-strip-types on Node >=22) or `tsx`.
  const url = pathToFileURL(resolve(APP_ROOT, rel)).href
  return import(url)
}

async function main() {
  const { collectDocInputs } = await importLib('lib/rag/ingest.ts')
  const { embedBatch, EMBED_MODEL, EMBED_DIM } = await importLib('lib/rag/embed.ts')

  const inputs = collectDocInputs()
  if (inputs.length === 0) {
    throw new Error('gen-ask-index: no docs found under content/docs')
  }

  // Embed in batches to bound peak memory; order is preserved per batch.
  const BATCH = 32
  const records = []
  for (let i = 0; i < inputs.length; i += BATCH) {
    const slice = inputs.slice(i, i + BATCH)
    const vectors = await embedBatch(slice.map((d) => d.content))
    slice.forEach((doc, j) => {
      records.push({
        id: doc.id,
        content: doc.content,
        source: doc.source,
        embedding: vectors[j],
        metadata: doc.metadata,
      })
    })
    process.stdout.write(`\rask-index: embedded ${Math.min(i + BATCH, inputs.length)}/${inputs.length}`)
  }
  process.stdout.write('\n')

  const snapshot = {
    schemaVersion: 1,
    model: EMBED_MODEL,
    dim: EMBED_DIM,
    count: records.length,
    generatedAt: new Date().toISOString(),
    records,
  }

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(snapshot))
  const bytes = Buffer.byteLength(JSON.stringify(snapshot), 'utf8')
  console.log(
    `ask-index: ${records.length} chunks, ${(bytes / 1024).toFixed(0)} KB → ${relative(APP_ROOT, OUT_FILE)}`,
  )
}

main().catch((err) => {
  console.error('[gen-ask-index] failed:', err)
  process.exit(1)
})
