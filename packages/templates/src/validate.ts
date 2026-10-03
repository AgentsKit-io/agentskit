import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { ToolDefinition, SkillDefinition, AdapterFactory } from '@agentskit/core'

const invalid = (message: string, hint?: string): ConfigError =>
  new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message, hint })

function requireTrimmedString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalid(`${label} must be a non-empty string`)
  }
}

function requireObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalid(`${label} must be an object`)
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Validate a tool definition and narrow the value to `ToolDefinition`.
 * @param tool The value to validate.
 * @returns Nothing; asserts that `tool` is a `ToolDefinition`.
 * @throws `ConfigError` when a required tool field is invalid.
 */
export function validateToolTemplate(tool: unknown): asserts tool is ToolDefinition {
  requireObject(tool, 'Tool')
  requireTrimmedString(tool.name, 'Tool name')
  requireTrimmedString(tool.description, `Tool "${tool.name}" description`)
  if (!isPlainObject(tool.schema)) {
    throw invalid(
      `Tool "${tool.name}" requires a schema — LLMs need JSON Schema for function calling`,
      'Pass a plain object JSON Schema (not null, not an array). `type` is optional.',
    )
  }
  if (typeof tool.execute !== 'function') {
    throw invalid(`Tool "${tool.name}" requires an execute function`)
  }
}

/** Validate a skill definition and narrow the value to `SkillDefinition`.
 * @param skill The value to validate.
 * @returns Nothing; asserts that `skill` is a `SkillDefinition`.
 * @throws `ConfigError` when a required skill field is invalid.
 */
export function validateSkillTemplate(skill: unknown): asserts skill is SkillDefinition {
  requireObject(skill, 'Skill')
  requireTrimmedString(skill.name, 'Skill name')
  requireTrimmedString(skill.description, `Skill "${skill.name}" description`)
  requireTrimmedString(skill.systemPrompt, `Skill "${skill.name}" systemPrompt`)
  if (skill.temperature !== undefined && !Number.isFinite(skill.temperature)) {
    throw invalid(
      `Skill "${skill.name}" temperature must be a finite number when provided`,
    )
  }
}

/** Validate an adapter factory and narrow it to its named adapter shape.
 * @param adapter The value to validate.
 * @returns Nothing; asserts that `adapter` has a name and `createSource` function.
 * @throws `ConfigError` when the adapter shape is invalid.
 */
export function validateAdapterTemplate(
  adapter: unknown,
): asserts adapter is AdapterFactory & { name: string } {
  if (!adapter || typeof adapter !== 'object' || Array.isArray(adapter)) {
    throw invalid('Adapter must be an object')
  }
  const a = adapter as Record<string, unknown>
  requireTrimmedString(a.name, 'Adapter name')
  if (typeof a.createSource !== 'function') {
    throw invalid(`Adapter "${String(a.name)}" requires a createSource function`)
  }
}
