/**
 * Skill + Tool Manifest — a serialization format for packaging
 * AgentsKit skills/tools for distribution. Compatible with MCP
 * tool descriptors (tools section reuses `inputSchema`), so a
 * manifest can round-trip through an MCP server without loss.
 */

import type { JSONSchema7 } from 'json-schema'

export const MANIFEST_VERSION = '2026-04'

export interface ManifestTool {
  name: string
  description?: string
  /** JSON Schema for the tool's arguments. Matches MCP `inputSchema`. */
  inputSchema?: JSONSchema7
  tags?: string[]
  category?: string
  requiresConfirmation?: boolean
}

export interface ManifestSkill {
  name: string
  description?: string
  /** System prompt template. */
  systemPrompt: string
  /** Tools this skill expects to be available. */
  tools?: string[]
  /** Names of other skills this one can delegate to. */
  delegates?: string[]
  examples?: Array<{ input: string; output: string }>
}

export interface Manifest {
  manifestVersion: typeof MANIFEST_VERSION
  name: string
  version: string
  publisher?: string
  homepage?: string
  description?: string
  tools?: ManifestTool[]
  skills?: ManifestSkill[]
  /** Free-form metadata (license, repo, compatibility). */
  metadata?: Record<string, unknown>
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Invalid manifest: ${msg}`)
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/
const SCHEMA_TYPES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'])

function assertSchema(raw: unknown, path: string, active = new Set<object>()): void {
  assert(isRecord(raw), `${path} must be an object`)
  if (active.has(raw)) throw new Error(`Invalid manifest: ${path} must not be cyclic`)
  active.add(raw)
  if (raw.type !== undefined) assert(typeof raw.type === 'string' && SCHEMA_TYPES.has(raw.type), `${path}.type is invalid`)
  if (raw.required !== undefined) {
    assert(Array.isArray(raw.required) && raw.required.every(v => typeof v === 'string'), `${path}.required must be string[]`)
  }
  if (raw.properties !== undefined) {
    assert(isRecord(raw.properties), `${path}.properties must be an object`)
    for (const [name, schema] of Object.entries(raw.properties)) assertSchema(schema, `${path}.properties.${name}`, active)
  }
  if (raw.items !== undefined) {
    if (Array.isArray(raw.items)) {
      raw.items.forEach((schema, i) => assertSchema(schema, `${path}.items[${i}]`, active))
    } else {
      assertSchema(raw.items, `${path}.items`, active)
    }
  }
  if (raw.additionalProperties !== undefined && typeof raw.additionalProperties !== 'boolean') {
    assertSchema(raw.additionalProperties, `${path}.additionalProperties`, active)
  }
  active.delete(raw)
}

export function validateManifest(raw: unknown): Manifest {
  assert(isRecord(raw), 'root must be an object')
  assert(raw.manifestVersion === MANIFEST_VERSION, `manifestVersion must be "${MANIFEST_VERSION}"`)
  assert(typeof raw.name === 'string' && raw.name.length > 0, 'name required')
  assert(typeof raw.version === 'string' && raw.version.length > 0, 'version required')

  const out: Manifest = {
    manifestVersion: MANIFEST_VERSION,
    name: raw.name,
    version: raw.version,
  }
  if (raw.publisher !== undefined) { assert(typeof raw.publisher === 'string', 'publisher must be string'); out.publisher = raw.publisher }
  if (raw.homepage !== undefined) { assert(typeof raw.homepage === 'string', 'homepage must be string'); out.homepage = raw.homepage }
  if (raw.description !== undefined) { assert(typeof raw.description === 'string', 'description must be string'); out.description = raw.description }
  if (raw.metadata !== undefined) { assert(isRecord(raw.metadata), 'metadata must be object'); out.metadata = raw.metadata }

  if (raw.tools !== undefined) {
    assert(Array.isArray(raw.tools), 'tools must be array')
    out.tools = raw.tools.map((t: unknown, i: number) => {
      assert(isRecord(t) && typeof t.name === 'string' && IDENT.test(t.name), `tools[${i}].name is invalid`)
      if (t.description !== undefined) assert(typeof t.description === 'string', `tools[${i}].description must be string`)
      if (t.inputSchema !== undefined) assertSchema(t.inputSchema, `tools[${i}].inputSchema`)
      if (t.tags !== undefined) {
        assert(Array.isArray(t.tags) && t.tags.every(v => typeof v === 'string'), `tools[${i}].tags must be string[]`)
      }
      if (t.category !== undefined) assert(typeof t.category === 'string', `tools[${i}].category must be string`)
      if (t.requiresConfirmation !== undefined) assert(typeof t.requiresConfirmation === 'boolean', `tools[${i}].requiresConfirmation must be boolean`)
      return t as unknown as ManifestTool
    })
  }
  if (raw.skills !== undefined) {
    assert(Array.isArray(raw.skills), 'skills must be array')
    out.skills = raw.skills.map((s: unknown, i: number) => {
      assert(
        isRecord(s) && typeof s.name === 'string' && IDENT.test(s.name) && typeof s.systemPrompt === 'string',
        `skills[${i}].name + systemPrompt required`,
      )
      if (s.description !== undefined) assert(typeof s.description === 'string', `skills[${i}].description must be string`)
      if (s.tools !== undefined) assert(Array.isArray(s.tools) && s.tools.every(v => typeof v === 'string'), `skills[${i}].tools must be string[]`)
      if (s.delegates !== undefined) assert(Array.isArray(s.delegates) && s.delegates.every(v => typeof v === 'string'), `skills[${i}].delegates must be string[]`)
      if (s.examples !== undefined) {
        assert(Array.isArray(s.examples), `skills[${i}].examples must be array`)
        const examples = s.examples as unknown[]
        examples.forEach((example, j) => assert(isRecord(example) && typeof example.input === 'string' && typeof example.output === 'string', `skills[${i}].examples[${j}] must contain input and output`))
      }
      return s as unknown as ManifestSkill
    })
  }
  return out
}
