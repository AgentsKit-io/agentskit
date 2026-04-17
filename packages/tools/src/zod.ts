import type { ToolDefinition, ToolExecutionContext, MaybePromise } from '@agentskit/core'
import type { JSONSchema7 } from 'json-schema'

// ---------------------------------------------------------------------------
// Minimal Zod type contract — avoids hard dependency on zod
// ---------------------------------------------------------------------------

/** Minimal shape of a Zod schema so we can infer its output type. */
interface ZodLike<T = unknown> {
  parse: (data: unknown) => T
  _output: T
}

/** Extract the output type from a Zod-like schema. */
type InferZodOutput<T> = T extends ZodLike<infer O> ? O : never

// ---------------------------------------------------------------------------
// defineZodTool — Zod-based tool definition with automatic type inference
// ---------------------------------------------------------------------------

export interface DefineZodToolConfig<TSchema extends ZodLike> {
  name: string
  description?: string
  schema: TSchema
  /**
   * Convert the Zod schema to JSON Schema.
   * Users must supply this themselves (e.g. via `zod-to-json-schema`),
   * keeping the zod dependency entirely optional.
   */
  toJsonSchema?: (schema: TSchema) => JSONSchema7
  requiresConfirmation?: boolean
  execute?: (
    args: InferZodOutput<TSchema>,
    context: ToolExecutionContext,
  ) => MaybePromise<unknown> | AsyncIterable<unknown>
  init?: () => MaybePromise<void>
  dispose?: () => MaybePromise<void>
  tags?: string[]
  category?: string
}

/**
 * Create a ToolDefinition whose execute args are typed from a Zod schema.
 *
 * Zod is NOT bundled — pass it as a peer dependency. The `toJsonSchema`
 * callback lets you convert the Zod schema to JSON Schema for the adapter
 * (e.g. using `zod-to-json-schema`).
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zodToJsonSchema } from 'zod-to-json-schema'
 * import { defineZodTool } from '@agentskit/tools'
 *
 * const weatherTool = defineZodTool({
 *   name: 'weather',
 *   description: 'Get weather for a city',
 *   schema: z.object({ city: z.string(), units: z.enum(['C', 'F']).optional() }),
 *   toJsonSchema: (s) => zodToJsonSchema(s) as JSONSchema7,
 *   execute: (args) => {
 *     // args.city is string, args.units is 'C' | 'F' | undefined
 *     return `Weather in ${args.city}: 22${args.units ?? 'C'}`
 *   },
 * })
 * ```
 */
export function defineZodTool<TSchema extends ZodLike>(
  config: DefineZodToolConfig<TSchema>,
): ToolDefinition<InferZodOutput<TSchema>> {
  const { schema, toJsonSchema, execute, ...rest } = config

  const jsonSchema = toJsonSchema ? toJsonSchema(schema) : undefined

  const wrappedExecute = execute
    ? (args: InferZodOutput<TSchema>, context: ToolExecutionContext) => {
        // Runtime validation via Zod
        const parsed = schema.parse(args) as InferZodOutput<TSchema>
        return execute(parsed, context)
      }
    : undefined

  return {
    ...rest,
    schema: jsonSchema,
    execute: wrappedExecute,
  } as ToolDefinition<InferZodOutput<TSchema>>
}
