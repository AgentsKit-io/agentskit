import type { ToolDefinition } from '@agentskit/core'
import type { JSONSchema7 } from 'json-schema'
import { webSearch } from './web-search'
import { fetchUrl } from './fetch-url'
import { filesystem } from './filesystem'
import { shell } from './shell'
import { tmpdir } from 'node:os'

export interface ToolMetadata {
  name: string
  description: string
  tags: string[]
  category: string
  schema: JSONSchema7
}

function extractMetadata(tool: ToolDefinition): ToolMetadata {
  return {
    name: tool.name,
    description: tool.description ?? '',
    tags: tool.tags ?? [],
    category: tool.category ?? '',
    schema: (tool.schema ?? { type: 'object' }) as JSONSchema7,
  }
}

export function listTools(): ToolMetadata[] {
  // Instantiate tools with safe defaults to extract their metadata
  const tools: ToolDefinition[] = [
    webSearch(),
    fetchUrl(),
    ...filesystem({ basePath: tmpdir() }),
    shell({ allowed: [] }),
  ]

  return tools.map(extractMetadata)
}
