import { defineAction } from '../../contract'

export const salesforceQuery = defineAction({
  name: 'salesforce_query',
  description: 'Run a SOQL query against Salesforce.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { soql: { type: 'string', description: 'e.g. SELECT Id, Name FROM Account LIMIT 10' } },
    required: ['soql'],
  },
  async execute(args, { http }) {
    const result = await http<{ totalSize: number; records?: Array<Record<string, unknown>> }>({
      method: 'GET',
      path: '/services/data/v60.0/query',
      query: { q: String(args.soql) },
    })
    return { totalSize: result.totalSize, records: result.records ?? [] }
  },
})

export const salesforceCreateRecord = defineAction({
  name: 'salesforce_create_record',
  description: 'Create a Salesforce sObject record.',
  sideEffect: 'external',
  sendCapability: 'records.create',
  schema: {
    type: 'object',
    properties: {
      sobject: { type: 'string', description: 'e.g. Account, Contact, Lead.' },
      fields: { type: 'object', description: 'Field API name → value map.' },
    },
    required: ['sobject', 'fields'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: string; success: boolean }>({
      method: 'POST',
      path: `/services/data/v60.0/sobjects/${args.sobject}`,
      body: args.fields,
    })
    return { id: result.id, success: result.success }
  },
})

export const salesforceActions = [salesforceQuery, salesforceCreateRecord]
