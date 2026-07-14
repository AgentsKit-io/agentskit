import Ajv from 'ajv'
import type { JSONSchema7 } from 'json-schema'
import type { ArgsValidationError, ArgsValidationResult, ArgsValidator } from '@agentskit/core'

/** Options for {@link createAjvValidator}. */
export interface AjvValidatorOptions {
  /**
   * Reject args that contain properties not declared in the schema.
   * Default `false` — models often add harmless extra keys, and rejecting
   * them tends to produce noisy failures. Set `true` for strict contracts.
   */
  rejectAdditionalProperties?: boolean
  /**
   * Coerce primitive types where unambiguous (e.g. "42" → 42) before
   * validating. Default `false` — surfaces model mistakes rather than
   * silently fixing them.
   */
  coerceTypes?: boolean
  /**
   * Provide a pre-configured Ajv instance to control formats, keywords, or
   * strict mode. When omitted a sensible default instance is created.
   */
  ajv?: Ajv
}

type CompiledValidate = ((data: unknown) => boolean) & {
  errors?: Array<{ instancePath?: string; message?: string }> | null
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
    const effective =
      options.rejectAdditionalProperties && isPlainObjectSchema(schema)
        ? { ...schema, additionalProperties: false }
        : schema
    const validate = ajv.compile(effective) as CompiledValidate
    cache.set(schema as object, validate)
    return validate
  }

  return (schema: JSONSchema7, args: Record<string, unknown>): ArgsValidationResult => {
    const validate = compile(schema)
    const ok = validate(args)
    if (ok) return { valid: true }
    const errors: ArgsValidationError[] = (validate.errors ?? []).map(e => ({
      path: normalizePath(e.instancePath),
      message: e.message ?? 'is invalid',
    }))
    const safe = errors.length > 0 ? errors : [{ path: '', message: 'is invalid' }]
    const detail = safe.map(e => (e.path ? `${e.path}: ${e.message}` : e.message)).join('; ')
    return { valid: false, errors: safe, message: `invalid tool arguments: ${detail}` }
  }
}

function isPlainObjectSchema(schema: JSONSchema7): boolean {
  return typeof schema === 'object' && schema.type === 'object' && schema.additionalProperties === undefined
}

/** Ajv uses JSON-pointer instancePaths ("/city"); expose a dotted path. */
function normalizePath(instancePath: string | undefined): string {
  if (!instancePath) return ''
  return instancePath.replace(/^\//, '').replace(/\//g, '.')
}
