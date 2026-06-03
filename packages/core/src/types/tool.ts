import type { JSONSchema7 } from 'json-schema'
import type { MaybePromise } from './common'
import type { Message } from './message'

export type ToolCallStatus = 'pending' | 'running' | 'complete' | 'error' | 'requires_confirmation'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  error?: string
  status: ToolCallStatus
}

export interface ToolExecutionContext {
  messages: Message[]
  call: ToolCall
}

// ---------------------------------------------------------------------------
// Runtime argument validation (ADR-0008)
//
// Validation is an injectable, opt-in capability. Core ships no validator and
// stays zero-dependency; callers provide an `ArgsValidator` (e.g. from
// `@agentskit/validation`) to enforce a tool's JSON Schema against the args a
// model produced. Default behaviour (no validator) is passthrough.
// ---------------------------------------------------------------------------

export interface ArgsValidationError {
  /** JSON pointer / dotted path to the offending field, or '' for root. */
  path: string
  message: string
}

export interface ArgsValidationResult {
  valid: boolean
  errors?: ArgsValidationError[]
  /** Optional pre-built human summary; used verbatim in the thrown error. */
  message?: string
}

/**
 * Validate parsed tool-call args against the tool's JSON Schema.
 * Returns `{ valid: true }` to allow execution, or `{ valid: false, errors }`
 * to reject it with `AK_TOOL_INVALID_INPUT`.
 */
export type ArgsValidator = (
  schema: JSONSchema7,
  args: Record<string, unknown>,
) => ArgsValidationResult

// ---------------------------------------------------------------------------
// JSON Schema -> TypeScript type inference (works with `as const` schemas)
// ---------------------------------------------------------------------------

/** Map JSON Schema `type` strings to TypeScript types. */
type JSONSchemaTypeMap = {
  string: string
  number: number
  integer: number
  boolean: boolean
  null: null
  object: Record<string, unknown>
  array: unknown[]
}

/** Resolve a single JSON Schema property to a TypeScript type. */
type InferJSONSchemaProperty<T> =
  T extends { type: 'object'; properties: infer P }
    ? InferJSONSchemaObject<T>
    : T extends { type: 'array'; items: infer I }
      ? Array<InferJSONSchemaProperty<I>>
      : T extends { type: infer U }
        ? U extends keyof JSONSchemaTypeMap
          ? JSONSchemaTypeMap[U]
          : unknown
        : unknown

/** Resolve an object schema to a mapped type with required/optional handling. */
type InferJSONSchemaObject<T> =
  T extends { properties: infer P; required: infer R }
    ? R extends readonly string[]
      ? { [K in keyof P & string as K extends R[number] ? K : never]: InferJSONSchemaProperty<P[K]> }
        & { [K in keyof P & string as K extends R[number] ? never : K]?: InferJSONSchemaProperty<P[K]> }
      : { [K in keyof P & string]?: InferJSONSchemaProperty<P[K]> }
    : T extends { properties: infer P }
      ? { [K in keyof P & string]?: InferJSONSchemaProperty<P[K]> }
      : Record<string, unknown>

/** Top-level inference: extract args type from a JSON Schema definition. */
export type InferSchemaType<T> =
  T extends { type: 'object'; properties: infer _P }
    ? InferJSONSchemaObject<T>
    : Record<string, unknown>

// ---------------------------------------------------------------------------
// ToolDefinition — generic with backward-compatible default
// ---------------------------------------------------------------------------

export interface ToolDefinition<TArgs = Record<string, unknown>> {
  name: string
  description?: string
  schema?: JSONSchema7
  requiresConfirmation?: boolean
  execute?: (
    args: TArgs,
    context: ToolExecutionContext,
  ) => MaybePromise<unknown> | AsyncIterable<unknown>
  init?: () => MaybePromise<void>
  dispose?: () => MaybePromise<void>
  tags?: string[]
  category?: string
}

// ---------------------------------------------------------------------------
// defineTool() — factory with automatic type inference from `as const` schemas
// ---------------------------------------------------------------------------

/** Config for defineTool: schema is narrowed to a const type for inference. */
export interface DefineToolConfig<TSchema extends JSONSchema7> {
  name: string
  description?: string
  schema?: TSchema
  requiresConfirmation?: boolean
  execute?: (
    args: InferSchemaType<TSchema>,
    context: ToolExecutionContext,
  ) => MaybePromise<unknown> | AsyncIterable<unknown>
  init?: () => MaybePromise<void>
  dispose?: () => MaybePromise<void>
  tags?: string[]
  category?: string
}

/** Create a ToolDefinition with automatic type inference from the JSON schema. */
export function defineTool<TSchema extends JSONSchema7>(
  config: DefineToolConfig<TSchema>,
): ToolDefinition<InferSchemaType<TSchema>> {
  return config as ToolDefinition<InferSchemaType<TSchema>>
}

export interface ToolCallHandlerContext {
  messages: Message[]
  tool?: ToolDefinition
}
