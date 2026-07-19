import { ErrorCodes, SkillError } from '@agentskit/core'
import type { SkillDefinition } from '@agentskit/core'

/** S1 — ADR 0005 / ADR 0002 T1 name shape. */
export const SKILL_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/

export function skillInvalid(message: string, hint?: string): SkillError {
  return new SkillError({
    code: ErrorCodes.AK_SKILL_INVALID,
    message,
    ...(hint !== undefined ? { hint } : {}),
  })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Deep-clone JSON-safe values; own `__proto__` keys stay as data props. */
export function cloneJsonValue<T>(value: T, path = 'value'): T {
  const active = new WeakSet<object>()
  const walk = (v: unknown, p: string): unknown => {
    if (v === null) return null
    const vt = typeof v
    if (vt === 'string' || vt === 'boolean') return v
    if (vt === 'number') {
      if (!Number.isFinite(v as number)) throw skillInvalid(`${p}: non-finite number is not JSON-safe`)
      return v
    }
    if (vt === 'undefined' || vt === 'function' || vt === 'symbol' || vt === 'bigint') {
      throw skillInvalid(`${p}: ${vt} is not JSON-safe`)
    }
    if (vt !== 'object') throw skillInvalid(`${p}: unsupported type`)
    const obj = v as object
    if (active.has(obj)) throw skillInvalid(`${p}: circular reference is not JSON-safe`)
    active.add(obj)
    try {
      if (Array.isArray(v)) return v.map((item, i) => walk(item, `${p}[${i}]`))
      if (!isPlainObject(v)) {
        throw skillInvalid(
          `${p}: only plain objects are JSON-safe (got ${Object.prototype.toString.call(v)})`,
        )
      }
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(v)) {
        Object.defineProperty(out, k, {
          value: walk(Object.getOwnPropertyDescriptor(v, k)?.value, `${p}.${k}`),
          writable: true,
          enumerable: true,
          configurable: true,
        })
      }
      return out
    } finally {
      active.delete(obj)
    }
  }
  return walk(value, path) as T
}

function assertUniqueNames(names: string[], kind: string): void {
  const seen = new Set<string>()
  for (const name of names) {
    if (!SKILL_NAME_RE.test(name)) throw skillInvalid(`invalid ${kind} name: ${JSON.stringify(name)}`)
    if (seen.has(name)) throw skillInvalid(`duplicate ${kind} name: "${name}"`)
    seen.add(name)
  }
}

function assertStringNameArray(value: unknown, kind: string, skillName: string): string[] {
  if (!Array.isArray(value)) {
    throw skillInvalid(`skill "${skillName}" ${kind}s must be an array of strings`)
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') {
      throw skillInvalid(`skill "${skillName}" ${kind}s[${i}] must be a string`)
    }
  }
  return value as string[]
}

/** Full ADR-0005 SkillDefinition validation (compose + marketplace). */
export function validateSkillDefinition(skill: unknown): void {
  if (skill === null || typeof skill !== 'object' || Array.isArray(skill)) {
    throw skillInvalid('skill must be a non-null object', 'Pass a SkillDefinition object.')
  }

  const s = skill as Record<string, unknown>
  const name = s.name

  if (typeof name !== 'string' || !SKILL_NAME_RE.test(name)) {
    throw skillInvalid(
      `invalid skill name: ${JSON.stringify(name)}`,
      'Name must match /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.',
    )
  }
  if (typeof s.description !== 'string' || s.description.trim().length === 0) {
    throw skillInvalid(`skill "${name}" requires a non-empty description`)
  }
  if (typeof s.systemPrompt !== 'string' || s.systemPrompt.trim().length === 0) {
    throw skillInvalid(`skill "${name}" requires a non-empty systemPrompt`)
  }
  if (s.temperature !== undefined) {
    const t = s.temperature
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 2) {
      throw skillInvalid(`skill "${name}" temperature must be a finite number in [0, 2]`)
    }
  }
  if (s.tools !== undefined) assertUniqueNames(assertStringNameArray(s.tools, 'tool', name), 'tool')
  if (s.delegates !== undefined) {
    assertUniqueNames(assertStringNameArray(s.delegates, 'delegate', name), 'delegate')
  }
  if (s.examples !== undefined) {
    if (!Array.isArray(s.examples)) throw skillInvalid(`skill "${name}" examples must be an array`)
    for (let i = 0; i < s.examples.length; i++) {
      const ex = s.examples[i]
      if (!isPlainObject(ex)) {
        throw skillInvalid(`skill "${name}" examples[${i}] must be a non-null plain object`)
      }
      if (typeof ex.input !== 'string' || ex.input.trim().length === 0) {
        throw skillInvalid(`skill "${name}" examples[${i}].input must be a non-empty string`)
      }
      if (typeof ex.output !== 'string' || ex.output.trim().length === 0) {
        throw skillInvalid(`skill "${name}" examples[${i}].output must be a non-empty string`)
      }
      cloneJsonValue(ex, `skill "${name}" examples[${i}]`)
    }
  }
  if (s.metadata !== undefined) cloneJsonValue(s.metadata, `skill "${name}" metadata`)
  if (s.onActivate !== undefined && typeof s.onActivate !== 'function') {
    throw skillInvalid(`skill "${name}" onActivate must be a function`)
  }
}

/** Defensive deep clone; preserves onActivate identity. */
export function cloneSkillDefinition(skill: SkillDefinition): SkillDefinition {
  const out: SkillDefinition = {
    name: skill.name,
    description: skill.description,
    systemPrompt: skill.systemPrompt,
  }
  if (skill.tools !== undefined) out.tools = skill.tools.slice()
  if (skill.delegates !== undefined) out.delegates = skill.delegates.slice()
  if (skill.temperature !== undefined) out.temperature = skill.temperature
  if (skill.examples !== undefined) {
    out.examples = skill.examples.map(ex => cloneJsonValue(ex, 'example'))
  }
  if (skill.metadata !== undefined) out.metadata = cloneJsonValue(skill.metadata, 'metadata')
  if (skill.onActivate !== undefined) out.onActivate = skill.onActivate
  return out
}

/** Last occurrence wins; Map insertion order preserved. */
export function dedupeNamesLastWins(names: string[]): string[] {
  const map = new Map<string, string>()
  for (const name of names) map.set(name, name)
  return [...map.values()]
}

/** Deterministic non-crypto hash for composed skill name suffixes. */
export function fnv1a32(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Deterministic S1-valid composed name ≤64 chars. */
export function composeSkillName(names: string[]): string {
  if (names.length === 1) return names[0]!
  const joined = names.join('_')
  if (joined.length <= 64 && SKILL_NAME_RE.test(joined)) return joined
  const suffix = `_${fnv1a32(names.join('\0'))}`
  const base = joined.slice(0, 64 - suffix.length).replace(/_+$/, '') || 'composed'
  return `${base}${suffix}`.slice(0, 64)
}

/** Shared disclaimers reused in prompts + examples (single string in the bundle). */
export const DISCLAIM = {
  medical:
    'This is general information, not medical advice. Please consult a clinician for your specific situation.',
  finance: 'This is general information, not investment, tax, or legal advice.',
  legal:
    'This is general information, not legal advice. Please consult a licensed attorney in your jurisdiction.',
} as const

/** Shared tool name lists (copied by defineSkill so consumers cannot alias across skills). */
export const TOOLS = {
  web: ['web_search', 'fetch_url'],
  webSearch: ['web_search'],
  read: ['read_file'],
  postgres: ['postgres_query'],
} as const

type Example = { input: string; output: string }

/** Compact SkillDefinition builder (always materializes tools/delegates arrays). */
export function defineSkill(
  name: string,
  description: string,
  systemPrompt: string,
  examples: Example[],
  tools: readonly string[] = [],
  delegates: readonly string[] = [],
): SkillDefinition {
  return {
    name,
    description,
    systemPrompt,
    examples,
    tools: tools.slice(),
    delegates: delegates.slice(),
  }
}
