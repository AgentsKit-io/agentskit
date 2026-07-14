import type { JSONSchema7 } from 'json-schema'

/**
 * Canonical JSON Schema for the provider/model catalog snapshot. Public export.
 *
 * JSON Schema is the single source of truth for contracts across AgentsKit
 * (core stays zero-dep; Zod is opt-in convenience only, never canonical). The
 * snapshot is validated against this schema at build time via the opt-in Ajv
 * path (`@agentskit/tools/validation`), not at runtime.
 */
export const catalogSnapshotSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://agentskit.io/schemas/catalog-snapshot.json',
  title: 'AgentsKit Catalog Snapshot',
  type: 'object',
  required: ['schemaVersion', 'generatedAt', 'source', 'providers'],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    generatedAt: { type: 'string', format: 'date-time' },
    source: {
      type: 'object',
      required: ['name', 'url', 'version'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', const: 'models.dev' },
        url: { type: 'string' },
        version: { type: 'string' },
      },
    },
    providers: {
      type: 'array',
      items: { $ref: '#/definitions/provider' },
    },
  },
  definitions: {
    provider: {
      type: 'object',
      required: ['id', 'name', 'env', 'openaiCompatible', 'models'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        env: { type: 'array', items: { type: 'string' } },
        baseUrl: { type: 'string' },
        doc: { type: 'string' },
        openaiCompatible: { type: 'boolean' },
        models: { type: 'array', items: { $ref: '#/definitions/model' } },
      },
    },
    model: {
      type: 'object',
      required: [
        'id',
        'name',
        'toolCall',
        'structuredOutput',
        'reasoning',
        'attachment',
        'openWeights',
      ],
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        family: { type: 'string' },
        limit: {
          type: 'object',
          additionalProperties: false,
          properties: {
            context: { type: 'number' },
            output: { type: 'number' },
          },
        },
        cost: {
          type: 'object',
          additionalProperties: false,
          properties: {
            input: { type: 'number' },
            output: { type: 'number' },
            cacheRead: { type: 'number' },
            cacheWrite: { type: 'number' },
          },
        },
        modalities: {
          type: 'object',
          required: ['input', 'output'],
          additionalProperties: false,
          properties: {
            input: { type: 'array', items: { type: 'string' } },
            output: { type: 'array', items: { type: 'string' } },
          },
        },
        toolCall: { type: 'boolean' },
        structuredOutput: { type: 'boolean' },
        reasoning: { type: 'boolean' },
        attachment: { type: 'boolean' },
        openWeights: { type: 'boolean' },
        knowledge: { type: 'string' },
        releaseDate: { type: 'string' },
        lastUpdated: { type: 'string' },
        deprecated: { type: 'boolean' },
      },
    },
  },
}
