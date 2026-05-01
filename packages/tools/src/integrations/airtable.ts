import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface AirtableConfig extends HttpToolOptions {
  /** Personal access token (https://airtable.com/create/tokens). */
  apiKey: string
  /** Base id, e.g. `app1234567890ABCD`. */
  baseId: string
}

function opts(config: AirtableConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? `https://api.airtable.com/v0/${config.baseId}/`,
    headers: { authorization: `Bearer ${config.apiKey}` },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function airtableListRecords(config: AirtableConfig) {
  return defineTool({
    name: 'airtable_list_records',
    description: 'List records from an Airtable table.',
    schema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table name or id.' },
        filterByFormula: { type: 'string' },
        pageSize: { type: 'number' },
      },
      required: ['table'],
    } as const,
    async execute({ table, filterByFormula, pageSize }) {
      const result = await httpJson<{
        records?: Array<{ id: string; fields: Record<string, unknown> }>
        offset?: string
      }>(opts(config), {
        method: 'GET',
        path: encodeURIComponent(String(table)),
        query: {
          filterByFormula: filterByFormula ? String(filterByFormula) : undefined,
          pageSize: typeof pageSize === 'number' ? pageSize : 50,
        },
      })
      return {
        records: (result.records ?? []).map(r => ({ id: r.id, fields: r.fields })),
        offset: result.offset,
      }
    },
  })
}

export function airtableCreateRecord(config: AirtableConfig) {
  return defineTool({
    name: 'airtable_create_record',
    description: 'Create a record in an Airtable table.',
    schema: {
      type: 'object',
      properties: {
        table: { type: 'string' },
        fields: { type: 'object', description: 'Field name → value map.' },
      },
      required: ['table', 'fields'],
    } as const,
    async execute({ table, fields }) {
      const result = await httpJson<{ id: string; fields: Record<string, unknown> }>(opts(config), {
        method: 'POST',
        path: encodeURIComponent(String(table)),
        body: { fields },
      })
      return { id: result.id, fields: result.fields }
    },
  })
}

export function airtable(config: AirtableConfig): ToolDefinition[] {
  return [
    airtableListRecords(config) as unknown as ToolDefinition,
    airtableCreateRecord(config) as unknown as ToolDefinition,
  ]
}
