import { createAjvValidator } from '@agentskit/tools/validation'
import type {
  AdapterFactory,
  AdapterRequest,
  StreamChunk,
} from '@agentskit/core'
import { describe, expect, it, vi } from 'vitest'
import {
  applyOverrides,
  catalog,
  catalogSnapshotSchema,
} from '../../src/catalog'
import type { CatalogModel, CatalogSnapshot } from '../../src/catalog'
import { createRouter as createAdapterRouter } from '../../src/router'

interface CapabilityMatrixRow {
  providerId: string
  modelId: string
  name: string
  family?: string
  limit?: CatalogModel['limit']
  cost?: CatalogModel['cost']
  modalities?: CatalogModel['modalities']
  toolCall: boolean
  structuredOutput: boolean
  reasoning: boolean
  attachment: boolean
  openWeights: boolean
  knowledge?: string
  releaseDate?: string
  lastUpdated?: string
  deprecated?: boolean
}

const validate = createAjvValidator({ rejectAdditionalProperties: true, preflight: false })

function buildCapabilityMatrix(snapshot: CatalogSnapshot): CapabilityMatrixRow[] {
  const result = validate(catalogSnapshotSchema, snapshot as unknown as Record<string, unknown>)
  if (!result.valid) {
    throw new Error(`catalog snapshot does not match its schema: ${result.message ?? 'unknown error'}`)
  }

  return snapshot.providers.flatMap(provider => provider.models.map(model => ({
    providerId: provider.id,
    modelId: model.id,
    name: model.name,
    family: model.family,
    limit: model.limit,
    cost: model.cost,
    modalities: model.modalities,
    toolCall: model.toolCall,
    structuredOutput: model.structuredOutput,
    reasoning: model.reasoning,
    attachment: model.attachment,
    openWeights: model.openWeights,
    knowledge: model.knowledge,
    releaseDate: model.releaseDate,
    lastUpdated: model.lastUpdated,
    deprecated: model.deprecated,
  })))
}

const matrixFixture: CatalogSnapshot = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  source: { name: 'models.dev', url: 'https://models.dev/api.json', version: 'test' },
  providers: [{
    id: 'matrix-provider',
    name: 'Matrix Provider',
    env: ['MATRIX_API_KEY'],
    openaiCompatible: true,
    models: [
      {
        id: 'tools-model',
        name: 'Tools Model',
        family: 'tools',
        limit: { context: 128_000, output: 8_192 },
        cost: { input: 1, output: 2 },
        modalities: { input: ['text'], output: ['text'] },
        toolCall: true,
        structuredOutput: true,
        reasoning: false,
        attachment: false,
        openWeights: false,
        knowledge: '2025-01',
        releaseDate: '2025-01-01',
        lastUpdated: '2026-01-01',
      },
      {
        id: 'legacy-model',
        name: 'Legacy Model',
        toolCall: false,
        structuredOutput: false,
        reasoning: false,
        attachment: false,
        openWeights: false,
        deprecated: true,
      },
    ],
  }],
}

function requestWithTools(): AdapterRequest {
  return {
    messages: [{
      id: '1',
      role: 'user',
      content: 'hi',
      status: 'complete',
      createdAt: new Date(0),
    }],
    context: {
      tools: [{
        name: 'lookup',
        description: 'Look up a value',
        schema: { type: 'object' },
        execute: async () => ({}),
      }],
    },
  }
}

function fakeAdapter(id: string): AdapterFactory {
  return {
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        yield { type: 'text', content: id } as StreamChunk
        yield { type: 'done' } as StreamChunk
      },
    }),
  }
}

describe('catalog capability matrix', () => {
  it('has one complete row per committed-snapshot model', () => {
    const rows = buildCapabilityMatrix(catalog)
    const modelCount = catalog.providers.reduce((count, provider) => count + provider.models.length, 0)

    expect(rows).toHaveLength(modelCount)
    expect(rows.every(row =>
      typeof row.toolCall === 'boolean' &&
      typeof row.structuredOutput === 'boolean' &&
      typeof row.reasoning === 'boolean' &&
      typeof row.attachment === 'boolean' &&
      typeof row.openWeights === 'boolean',
    )).toBe(true)
    expect(rows.some(row => row.modalities || row.limit || row.cost)).toBe(true)
  })

  it('is snapshot-only and never fetches while building', () => {
    const originalFetch = globalThis.fetch
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch
    try {
      buildCapabilityMatrix(catalog)
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('fails closed when the snapshot diverges from its schema', () => {
    const invalid = structuredClone(matrixFixture) as CatalogSnapshot
    const model = invalid.providers[0]!.models[0]!
    invalid.providers[0]!.models[0] = { ...model, toolCall: undefined as unknown as boolean }

    expect(() => buildCapabilityMatrix(invalid)).toThrow(/does not match its schema/)
  })

  it('preserves deprecation and lifecycle metadata without rewriting model ids', () => {
    const rows = buildCapabilityMatrix(matrixFixture)
    const legacy = rows.find(row => row.modelId === 'legacy-model')

    expect(legacy?.deprecated).toBe(true)
    expect(legacy?.modelId).toBe('legacy-model')
    expect(rows.find(row => row.modelId === 'tools-model')).toMatchObject({
      knowledge: '2025-01',
      releaseDate: '2025-01-01',
      lastUpdated: '2026-01-01',
    })
  })

  it('feeds capability-match from the same matrix and honors model overrides', async () => {
    const rows = buildCapabilityMatrix(matrixFixture)
    const router = createAdapterRouter({
      policy: 'capability-match',
      candidates: rows.map(row => ({
        id: `${row.providerId}/${row.modelId}`,
        adapter: fakeAdapter(row.modelId),
        capabilities: { tools: row.toolCall },
        cost: row.cost?.input,
      })),
    })

    const selected = router.createSource(requestWithTools())
    expect(selected).toBeDefined()
    const selectedText: string[] = []
    for await (const chunk of selected.stream()) {
      if (chunk.type === 'text' && chunk.content) selectedText.push(chunk.content)
    }
    expect(selectedText).toEqual(['tools-model'])

    const overridden = applyOverrides(matrixFixture, {
      allowedModels: { 'matrix-provider': ['legacy-model'] },
    })
    const overriddenRows = buildCapabilityMatrix(overridden)
    const overriddenRouter = createAdapterRouter({
      policy: 'capability-match',
      candidates: overriddenRows.map(row => ({
        id: `${row.providerId}/${row.modelId}`,
        adapter: fakeAdapter(row.modelId),
        capabilities: { tools: row.toolCall },
      })),
    })

    expect(overriddenRows).toHaveLength(1)
    expect(overriddenRows[0]?.toolCall).toBe(false)
    expect(() => overriddenRouter.createSource(requestWithTools())).toThrow(/no candidate satisfies/)
  })
})
