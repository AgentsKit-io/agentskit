import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineTool } from '@agentskit/core'
import type { ToolDefinition } from '@agentskit/core'
import { filesystem } from '../src/filesystem'
import { webSearch } from '../src/web-search'
import {
  loadToolCallFixtures,
  runToolContract,
  runToolLifecycleContract,
  runTool,
  contractValidator,
} from './contract'

const fixtures = loadToolCallFixtures()
const weather = fixtures['call-and-result']!
const weatherError = fixtures['error-result']!

const base = mkdtempSync(join(tmpdir(), 'agentskit-tool-contract-'))
afterAll(() => rmSync(base, { recursive: true, force: true }))

const weatherSchema = {
  type: 'object',
  properties: { city: { type: 'string', minLength: 1 } },
  required: ['city'],
} as const

runToolContract([
  {
    name: 'core defineTool (fixture: get_weather)',
    build: () => [
      defineTool({
        name: weather.name,
        description: 'Weather',
        schema: weatherSchema,
        execute: async args => ({ tempC: 21, city: args.city }),
      }),
    ],
    validArgs: { [weather.name]: weather.args },
    invalidArgs: { [weather.name]: weatherError.args },
  },
  {
    name: '@agentskit/tools filesystem (temporary directory)',
    build: () => filesystem({ basePath: base }),
    validArgs: { list_directory: { path: '.' } },
    invalidArgs: { read_file: {} },
  },
  {
    name: '@agentskit/tools webSearch (fake search)',
    build: () => [webSearch({ search: async () => [{ title: 'T', url: 'https://example.com', snippet: 'S' }] })],
    validArgs: { web_search: { query: 'agentskit' } },
    invalidArgs: { web_search: {} },
  },
])

runToolLifecycleContract('core defineTool', overrides =>
  ({ name: 'probe', ...overrides }) as ToolDefinition,
)

describe('Tool contract fixtures', () => {
  it('the error-result fixture is rejected by the boundary validator (T3)', async () => {
    const tool = defineTool({ name: weather.name, schema: weatherSchema, execute: () => 'never' })
    const res = await runTool(tool, weatherError.args, { validate: contractValidator })
    expect(res.status).toBe('error')
    expect(weatherError.status).toBe('error')
  })

  it('the filesystem tool leaves the temporary directory untouched at definition time (T10)', () => {
    filesystem({ basePath: base })
    expect(readdirSync(base)).toEqual([])
  })
})
