#!/usr/bin/env node
/**
 * models.dev sync tool — read-only fetch → normalize → emit snapshot JSON.
 *
 * Build-time only. The runtime never fetches models.dev; this script regenerates
 * the committed snapshot at `packages/adapters/src/catalog/snapshot.json`.
 * Run monthly (or on demand) to refresh the catalog, then commit the diff.
 *
 * Usage:
 *   node scripts/sync-models-dev.mjs            # fetch live, write snapshot
 *   node scripts/sync-models-dev.mjs --version <v>   # pin source version label
 *
 * The emitted snapshot carries `generatedAt` + a pinned `source.version` so
 * consumers can reason about staleness. Pricing/limits are advisory metadata.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SOURCE_URL = 'https://models.dev/api.json'
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'packages', 'adapters', 'src', 'catalog', 'snapshot.json')

/** The npm field models.dev uses to mark OpenAI-compatible transports. */
const OPENAI_COMPATIBLE_NPM = '@ai-sdk/openai-compatible'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function normalizeModel(raw) {
  const model = {
    id: String(raw.id),
    name: String(raw.name ?? raw.id),
    toolCall: Boolean(raw.tool_call),
    structuredOutput: Boolean(raw.structured_output),
    reasoning: Boolean(raw.reasoning),
    attachment: Boolean(raw.attachment),
    openWeights: Boolean(raw.open_weights),
  }
  if (raw.family) model.family = String(raw.family)
  if (raw.limit && (raw.limit.context != null || raw.limit.output != null)) {
    model.limit = {}
    if (raw.limit.context != null) model.limit.context = Number(raw.limit.context)
    if (raw.limit.output != null) model.limit.output = Number(raw.limit.output)
  }
  if (raw.cost && typeof raw.cost === 'object') {
    const cost = {}
    if (raw.cost.input != null) cost.input = Number(raw.cost.input)
    if (raw.cost.output != null) cost.output = Number(raw.cost.output)
    if (raw.cost.cache_read != null) cost.cacheRead = Number(raw.cost.cache_read)
    if (raw.cost.cache_write != null) cost.cacheWrite = Number(raw.cost.cache_write)
    if (Object.keys(cost).length > 0) model.cost = cost
  }
  if (raw.modalities && Array.isArray(raw.modalities.input) && Array.isArray(raw.modalities.output)) {
    model.modalities = {
      input: raw.modalities.input.map(String),
      output: raw.modalities.output.map(String),
    }
  }
  if (raw.knowledge) model.knowledge = String(raw.knowledge)
  if (raw.release_date) model.releaseDate = String(raw.release_date)
  if (raw.last_updated) model.lastUpdated = String(raw.last_updated)
  return model
}

function normalizeProvider(raw) {
  const provider = {
    id: String(raw.id),
    name: String(raw.name ?? raw.id),
    env: Array.isArray(raw.env) ? raw.env.map(String) : [],
    openaiCompatible: raw.npm === OPENAI_COMPATIBLE_NPM,
    models: Object.values(raw.models ?? {})
      .map(normalizeModel)
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
  if (raw.api) provider.baseUrl = String(raw.api)
  if (raw.doc) provider.doc = String(raw.doc)
  return provider
}

async function main() {
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`models.dev fetch failed: ${res.status} ${res.statusText}`)
  const data = await res.json()

  const providers = Object.values(data)
    .map(normalizeProvider)
    .sort((a, b) => a.id.localeCompare(b.id))

  // Deterministic timestamp source: allow override for reproducible builds.
  const generatedAt = arg('--generated-at') ?? new Date().toISOString()
  const version = arg('--version') ?? generatedAt.slice(0, 10)

  const snapshot = {
    schemaVersion: 1,
    generatedAt,
    source: { name: 'models.dev', url: SOURCE_URL, version },
    providers,
  }

  writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n')
  const modelCount = providers.reduce((n, p) => n + p.models.length, 0)
  const compat = providers.filter((p) => p.openaiCompatible).length
  console.log(
    `snapshot written: ${providers.length} providers (${compat} openai-compatible), ${modelCount} models → ${OUT}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
