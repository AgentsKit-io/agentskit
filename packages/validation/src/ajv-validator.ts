import Ajv from 'ajv'
import type { ErrorObject } from 'ajv'
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema'
import type { ArgsValidationError, ArgsValidationResult, ArgsValidator } from '@agentskit/core'

/** Options for {@link createAjvValidator}. */
export interface AjvValidatorOptions {
  /**
   * Recursively close ordinary object schemas that omit `additionalProperties`.
   * Explicit policies and composition/applicator boundaries stay as authored.
   * Default `false` — set `true` for strict contracts.
   */
  rejectAdditionalProperties?: boolean
  /**
   * Coerce primitive types where unambiguous (e.g. "42" → 42) before
   * validating. Default `false` — surfaces model mistakes rather than
   * silently fixing them. Coercion can mutate the supplied args object.
   */
  coerceTypes?: boolean
  /**
   * Provide a pre-configured Ajv instance to control formats, keywords, or
   * strict mode. A supplied instance owns its Ajv behavior; `coerceTypes` only
   * configures the default instance created here.
   */
  ajv?: Ajv
}

type CompiledValidate = ((data: unknown) => boolean) & {
  errors?: ErrorObject[] | null
}

/**
 * Create an {@link ArgsValidator} backed by Ajv that checks tool-call args
 * against the tool's existing `JSONSchema7` (ADR-0008).
 *
 * JSON Schema remains the single source of truth — this only enforces it at
 * runtime. Pass the result to `validateArgs` on the chat controller or runtime
 * config.
 *
 * @example
 * ```ts
 * import { createChatController } from '@agentskit/core'
 * import { createAjvValidator } from '@agentskit/tools/validation'
 *
 * const chat = createChatController({
 *   adapter,
 *   tools: [weatherTool],
 *   validateArgs: createAjvValidator(),
 * })
 * ```
 */
export function createAjvValidator(options: AjvValidatorOptions = {}): ArgsValidator {
  const ajv =
    options.ajv ??
    new Ajv({
      allErrors: true,
      strict: false,
      coerceTypes: options.coerceTypes ?? false,
      removeAdditional: false,
    })

  // Compiled validators are cached by schema identity so repeated tool calls
  // do not recompile. Schemas are stable object references on ToolDefinition.
  const cache = new WeakMap<object, CompiledValidate>()

  function compile(schema: JSONSchema7): CompiledValidate {
    const cached = cache.get(schema as object)
    if (cached) return cached
    const effective = options.rejectAdditionalProperties ? hardenObjectBoundaries(schema) : schema
    const validate = ajv.compile(effective) as CompiledValidate
    cache.set(schema as object, validate)
    return validate
  }

  return (schema: JSONSchema7, args: Record<string, unknown>): ArgsValidationResult => {
    const validate = compile(schema)
    const ok = validate(args)
    if (ok) return { valid: true }
    const errors: ArgsValidationError[] = (validate.errors ?? []).map(e => ({
      path: errorPath(e),
      message: e.message ?? 'is invalid',
    }))
    const safe = errors.length > 0 ? errors : [{ path: '', message: 'is invalid' }]
    const detail = safe.map(e => (e.path ? `${e.path}: ${e.message}` : e.message)).join('; ')
    return { valid: false, errors: safe, message: `invalid tool arguments: ${detail}` }
  }
}

function hardenObjectBoundaries(schema: JSONSchema7): JSONSchema7 {
  const regular = new WeakMap<object, JSONSchema7>()
  const suppressed = new WeakMap<object, JSONSchema7>()

  function visitDefinition(definition: JSONSchema7Definition, suppressBoundary = false): JSONSchema7Definition {
    return typeof definition === 'boolean' ? definition : visit(definition, suppressBoundary)
  }

  function visit(current: JSONSchema7, suppressBoundary = false): JSONSchema7 {
    const seen = suppressBoundary ? suppressed : regular
    const cached = seen.get(current)
    if (cached) return cached

    const clone: JSONSchema7 = { ...current }
    seen.set(current, clone)

    clone.properties = mapDefinitions(current.properties)
    clone.patternProperties = mapDefinitions(current.patternProperties)
    clone.definitions = mapDefinitions(current.definitions)
    clone.$defs = mapDefinitions(current.$defs)
    clone.items = Array.isArray(current.items)
      ? current.items.map(item => visitDefinition(item))
      : current.items === undefined
        ? undefined
        : visitDefinition(current.items)
    clone.additionalItems = visitOptional(current.additionalItems)
    clone.contains = visitOptional(current.contains)
    clone.propertyNames = visitOptional(current.propertyNames)
    clone.additionalProperties = visitOptional(current.additionalProperties)
    clone.dependencies = current.dependencies
      ? Object.fromEntries(
          Object.entries(current.dependencies).map(([key, dependency]) => [
            key,
            Array.isArray(dependency) ? [...dependency] : visitDefinition(dependency, true),
          ]),
        )
      : undefined

    const hasComposition = Boolean(
      current.allOf || current.anyOf || current.oneOf || current.not || current.if || current.then || current.else,
    )
    clone.allOf = visitComposition(current.allOf)
    clone.anyOf = visitComposition(current.anyOf)
    clone.oneOf = visitComposition(current.oneOf)
    clone.not = visitCompositionDefinition(current.not)
    clone.if = visitCompositionDefinition(current.if)
    clone.then = visitCompositionDefinition(current.then)
    clone.else = visitCompositionDefinition(current.else)

    if (
      !suppressBoundary &&
      !hasComposition &&
      current.additionalProperties === undefined &&
      isObjectBoundary(current)
    ) {
      clone.additionalProperties = false
    }

    return clone
  }

  function mapDefinitions(
    definitions: Record<string, JSONSchema7Definition> | undefined,
  ): Record<string, JSONSchema7Definition> | undefined {
    return definitions
      ? Object.fromEntries(Object.entries(definitions).map(([key, value]) => [key, visitDefinition(value)]))
      : undefined
  }

  function visitOptional(definition: JSONSchema7Definition | undefined): JSONSchema7Definition | undefined {
    return definition === undefined ? undefined : visitDefinition(definition)
  }

  function visitComposition(
    definitions: JSONSchema7Definition[] | undefined,
  ): JSONSchema7Definition[] | undefined {
    return definitions?.map(definition => visitDefinition(definition, true))
  }

  function visitCompositionDefinition(
    definition: JSONSchema7Definition | undefined,
  ): JSONSchema7Definition | undefined {
    return definition === undefined ? undefined : visitDefinition(definition, true)
  }

  return visit(schema)
}

function isObjectBoundary(schema: JSONSchema7): boolean {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  return types.includes('object') || schema.properties !== undefined || schema.patternProperties !== undefined
}

function errorPath(error: ErrorObject): string {
  const segments = decodePointer(error.instancePath)
  if (error.keyword === 'required' && hasStringProperty(error.params, 'missingProperty')) {
    segments.push(error.params.missingProperty)
  }
  if (error.keyword === 'additionalProperties' && hasStringProperty(error.params, 'additionalProperty')) {
    segments.push(error.params.additionalProperty)
  }
  return formatPath(segments)
}

function decodePointer(pointer: string): string[] {
  if (!pointer) return []
  return pointer
    .slice(1)
    .split('/')
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
}

function formatPath(segments: string[]): string {
  return segments.reduce((path, segment) => {
    if (/^(0|[1-9]\d*)$/.test(segment)) return `${path}[${segment}]`
    if (/^[A-Za-z_$][\w$]*$/.test(segment)) return path ? `${path}.${segment}` : segment
    return `${path}[${JSON.stringify(segment)}]`
  }, '')
}

function hasStringProperty<T extends string>(value: Record<string, unknown>, key: T): value is Record<T, string> {
  return typeof value[key] === 'string'
}
