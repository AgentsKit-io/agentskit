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

export function validateManifest(raw: unknown): Manifest {
  assert(isRecord(raw), 'root must be an object')
  assert(raw.manifestVersion === MANIFEST_VERSION, `manifestVersion must be "${MANIFEST_VERSION}"`)
  assert(typeof raw.name === 'string', 'name required')
  assert(typeof raw.version === 'string', 'version required')

  const out: Manifest = {
    manifestVersion: MANIFEST_VERSION,
    name: raw.name,
    version: raw.version,
  }
  if (typeof raw.publisher === 'string') out.publisher = raw.publisher
  if (typeof raw.homepage === 'string') out.homepage = raw.homepage
  if (typeof raw.description === 'string') out.description = raw.description
  if (isRecord(raw.metadata)) out.metadata = raw.metadata

  if (raw.tools !== undefined) {
    assert(Array.isArray(raw.tools), 'tools must be array')
    out.tools = raw.tools.map((t: unknown, i: number) => {
      assert(isRecord(t) && typeof t.name === 'string', `tools[${i}].name required`)
      return t as unknown as ManifestTool
    })
  }
  if (raw.skills !== undefined) {
    assert(Array.isArray(raw.skills), 'skills must be array')
    out.skills = raw.skills.map((s: unknown, i: number) => {
      assert(
        isRecord(s) && typeof s.name === 'string' && typeof s.systemPrompt === 'string',
        `skills[${i}].name + systemPrompt required`,
      )
      return s as unknown as ManifestSkill
    })
  }
  return out
}
