import { createHash } from 'node:crypto'

export const MODELS_DEV_URL = 'https://models.dev/api.json'
const OPENAI_COMPATIBLE_NPM = '@ai-sdk/openai-compatible'

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function normalizeReasoningOption(raw) {
  const option = { type: String(raw.type) }
  if (Array.isArray(raw.values)) option.values = raw.values.map(String)
  const min = asNumber(raw.min)
  const max = asNumber(raw.max)
  if (min !== undefined) option.min = min
  if (max !== undefined) option.max = max
  return option
}

function normalizeCostTier(raw) {
  const tier = {}
  const input = asNumber(raw.input)
  const output = asNumber(raw.output)
  const cacheRead = asNumber(raw.cache_read)
  const cacheWrite = asNumber(raw.cache_write)
  if (input !== undefined) tier.input = input
  if (output !== undefined) tier.output = output
  if (cacheRead !== undefined) tier.cacheRead = cacheRead
  if (cacheWrite !== undefined) tier.cacheWrite = cacheWrite
  if (raw.tier && typeof raw.tier === 'object') {
    const descriptor = { type: String(raw.tier.type) }
    const size = asNumber(raw.tier.size)
    if (size !== undefined) descriptor.size = size
    tier.tier = descriptor
  }
  return tier
}

function normalizeCost(raw) {
  if (!raw || typeof raw !== 'object') return undefined
  const cost = normalizeCostTier(raw)
  if (Array.isArray(raw.tiers)) cost.tiers = raw.tiers.map(normalizeCostTier)
  if (raw.context_over_200k && typeof raw.context_over_200k === 'object') {
    cost.contextOver200k = normalizeCostTier(raw.context_over_200k)
  }
  return Object.keys(cost).length > 0 ? cost : undefined
}

export function normalizeModel(raw) {
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
  if (raw.limit && typeof raw.limit === 'object') {
    const limit = {}
    const context = asNumber(raw.limit.context)
    const input = asNumber(raw.limit.input)
    const output = asNumber(raw.limit.output)
    if (context !== undefined) limit.context = context
    if (input !== undefined) limit.input = input
    if (output !== undefined) limit.output = output
    if (Object.keys(limit).length > 0) model.limit = limit
  }
  const cost = normalizeCost(raw.cost)
  if (cost) model.cost = cost
  if (raw.modalities && Array.isArray(raw.modalities.input) && Array.isArray(raw.modalities.output)) {
    model.modalities = {
      input: raw.modalities.input.map(String),
      output: raw.modalities.output.map(String),
    }
  }
  if (Array.isArray(raw.reasoning_options)) {
    model.reasoningOptions = raw.reasoning_options.map(normalizeReasoningOption)
  }
  if (raw.status) {
    model.status = String(raw.status)
    model.deprecated = raw.status === 'deprecated'
  }
  if (raw.knowledge) model.knowledge = String(raw.knowledge)
  if (raw.release_date) model.releaseDate = String(raw.release_date)
  if (raw.last_updated) model.lastUpdated = String(raw.last_updated)
  return model
}

export function normalizeProvider(raw) {
  const provider = {
    id: String(raw.id),
    name: String(raw.name ?? raw.id),
    env: Array.isArray(raw.env) ? raw.env.map(String) : [],
    openaiCompatible: raw.npm === OPENAI_COMPATIBLE_NPM,
    models: Object.values(raw.models ?? {})
      .map(normalizeModel)
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
  if (raw.npm) provider.npm = String(raw.npm)
  if (raw.api) provider.baseUrl = String(raw.api)
  if (raw.doc) provider.doc = String(raw.doc)
  return provider
}

export function normalizedContentHash(providers) {
  return createHash('sha256')
    .update(JSON.stringify(providers))
    .digest('hex')
}

export function buildSnapshot(data, options = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('models.dev response must be a provider map')
  }
  const providers = Object.values(data)
    .map(normalizeProvider)
    .sort((a, b) => a.id.localeCompare(b.id))
  const contentHash = options.contentHash ?? normalizedContentHash(providers)
  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const version = options.version ?? contentHash.slice(0, 16)
  const source = { name: 'models.dev', url: MODELS_DEV_URL, version, contentHash }
  if (options.etag) source.etag = options.etag
  return { schemaVersion: 1, generatedAt, source, providers }
}

export async function fetchModelsDev(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? 15000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(MODELS_DEV_URL, { signal: controller.signal })
    if (!response.ok) throw new Error(`models.dev fetch failed: ${response.status} ${response.statusText}`)
    const data = await response.json()
    const etag = response.headers.get('etag') ?? undefined
    return { data, snapshot: buildSnapshot(data, { etag }), etag }
  } finally {
    clearTimeout(timer)
  }
}
