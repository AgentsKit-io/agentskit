import type { JSONSchema7 } from 'json-schema'
import { isRecord } from './primitives'

/** Provider and optional generation settings for an agent model. */
export interface AgentSchemaModel {
  provider: string
  model?: string
  temperature?: number
  maxTokens?: number
  baseUrl?: string
}

/** Tool declaration included in an agent configuration schema. */
export interface AgentSchemaTool {
  name: string
  description?: string
  schema?: JSONSchema7
  /** Free-form hint string handed to code generators. */
  implementation?: string
  requiresConfirmation?: boolean
  tags?: string[]
}

/** Memory adapter selection and configuration for an agent. */
export interface AgentSchemaMemory {
  kind: 'inMemory' | 'localStorage' | 'custom'
  key?: string
  options?: Record<string, unknown>
}

/** Portable declarative configuration for an AgentsKit agent. */
export interface AgentSchema {
  name: string
  description?: string
  systemPrompt?: string
  model: AgentSchemaModel
  tools?: AgentSchemaTool[]
  memory?: AgentSchemaMemory
  skills?: string[]
  metadata?: Record<string, unknown>
}

/** Options for parsing an agent schema with a caller-supplied format parser. */
export interface ParseAgentSchemaOptions {
  /**
   * Parser for non-JSON input (e.g. YAML). Defaults to `JSON.parse`.
   * Keeps the core zero-dep: bring your own YAML parser.
   */
  parser?: (input: string) => unknown
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_-]*$/

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid agent schema: ${message}`)
}

function validateModel(raw: unknown): AgentSchemaModel {
  assert(isRecord(raw), 'model must be an object')
  assert(typeof raw.provider === 'string' && raw.provider.length > 0, 'model.provider is required')
  const out: AgentSchemaModel = { provider: raw.provider }
  if (raw.model !== undefined) {
    assert(typeof raw.model === 'string', 'model.model must be a string')
    out.model = raw.model
  }
  if (raw.temperature !== undefined) {
    assert(typeof raw.temperature === 'number', 'model.temperature must be a number')
    out.temperature = raw.temperature
  }
  if (raw.maxTokens !== undefined) {
    assert(typeof raw.maxTokens === 'number', 'model.maxTokens must be a number')
    out.maxTokens = raw.maxTokens
  }
  if (raw.baseUrl !== undefined) {
    assert(typeof raw.baseUrl === 'string', 'model.baseUrl must be a string')
    out.baseUrl = raw.baseUrl
  }
  return out
}

function validateTool(raw: unknown, index: number): AgentSchemaTool {
  assert(isRecord(raw), `tools[${index}] must be an object`)
  assert(typeof raw.name === 'string' && IDENT.test(raw.name), `tools[${index}].name must match /[a-zA-Z_][a-zA-Z0-9_-]*/`)
  const tool: AgentSchemaTool = { name: raw.name }
  if (raw.description !== undefined) {
    assert(typeof raw.description === 'string', `tools[${index}].description must be string`)
    tool.description = raw.description
  }
  if (raw.schema !== undefined) {
    assert(isRecord(raw.schema), `tools[${index}].schema must be an object`)
    tool.schema = raw.schema as JSONSchema7
  }
  if (raw.implementation !== undefined) {
    assert(typeof raw.implementation === 'string', `tools[${index}].implementation must be string`)
    tool.implementation = raw.implementation
  }
  if (raw.requiresConfirmation !== undefined) {
    assert(typeof raw.requiresConfirmation === 'boolean', `tools[${index}].requiresConfirmation must be boolean`)
    tool.requiresConfirmation = raw.requiresConfirmation
  }
  if (raw.tags !== undefined) {
    assert(Array.isArray(raw.tags) && raw.tags.every(t => typeof t === 'string'), `tools[${index}].tags must be string[]`)
    tool.tags = raw.tags as string[]
  }
  return tool
}

function validateMemory(raw: unknown): AgentSchemaMemory {
  assert(isRecord(raw), 'memory must be an object')
  assert(
    raw.kind === 'inMemory' || raw.kind === 'localStorage' || raw.kind === 'custom',
    `memory.kind must be 'inMemory' | 'localStorage' | 'custom'`,
  )
  const out: AgentSchemaMemory = { kind: raw.kind }
  if (raw.key !== undefined) {
    assert(typeof raw.key === 'string', 'memory.key must be a string')
    out.key = raw.key
  }
  if (raw.options !== undefined) {
    assert(isRecord(raw.options), 'memory.options must be an object')
    out.options = raw.options
  }
  return out
}

/**
 * Validate a raw agent-schema object (e.g. a parsed YAML / JSON
 * document) into a typed `AgentSchema`. Throws on the first problem
 * with a descriptive path.
 */
export function validateAgentSchema(raw: unknown): AgentSchema {
  assert(isRecord(raw), 'schema root must be an object')
  assert(typeof raw.name === 'string' && IDENT.test(raw.name), `name must match /[a-zA-Z_][a-zA-Z0-9_-]*/`)
  assert(raw.model !== undefined, 'model is required')

  const out: AgentSchema = {
    name: raw.name,
    model: validateModel(raw.model),
  }
  if (raw.description !== undefined) {
    assert(typeof raw.description === 'string', 'description must be a string')
    out.description = raw.description
  }
  if (raw.systemPrompt !== undefined) {
    assert(typeof raw.systemPrompt === 'string', 'systemPrompt must be a string')
    out.systemPrompt = raw.systemPrompt
  }
  if (raw.tools !== undefined) {
    assert(Array.isArray(raw.tools), 'tools must be an array')
    const names = new Set<string>()
    out.tools = raw.tools.map((t, i) => {
      const tool = validateTool(t, i)
      assert(!names.has(tool.name), `duplicate tool name: ${tool.name}`)
      names.add(tool.name)
      return tool
    })
  }
  if (raw.memory !== undefined) out.memory = validateMemory(raw.memory)
  if (raw.skills !== undefined) {
    assert(Array.isArray(raw.skills) && raw.skills.every(s => typeof s === 'string'), 'skills must be string[]')
    out.skills = raw.skills as string[]
  }
  if (raw.metadata !== undefined) {
    assert(isRecord(raw.metadata), 'metadata must be an object')
    out.metadata = raw.metadata
  }
  return out
}

/**
 * Parse a JSON (default) or text-format agent definition. Provide
 * `options.parser` for YAML or other formats. Keeps core zero-dep.
 */
export function parseAgentSchema(text: string, options: ParseAgentSchemaOptions = {}): AgentSchema {
  const raw = options.parser ? options.parser(text) : JSON.parse(text)
  return validateAgentSchema(raw)
}

/**
 * Render a TypeScript module source string that re-exports a typed
 * `AgentSchema` constant. Useful for "compile YAML → .ts" build steps.
 */
export function renderAgentSchemaModule(schema: AgentSchema): string {
  const literal = JSON.stringify(schema, null, 2)
  return `import type { AgentSchema } from '@agentskit/core/agent-schema'\n\nexport const agent = ${literal} as const satisfies AgentSchema\n`
}
