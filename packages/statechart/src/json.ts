import type { DeepReadonly, JsonObject, JsonValue } from './types'

const cloneJsonValue = (
  input: unknown,
  ancestors: ReadonlySet<object>,
): DeepReadonly<JsonValue> => {
  if (
    input === null ||
    typeof input === 'string' ||
    typeof input === 'boolean'
  ) {
    return input
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new TypeError('JSON numbers must be finite')
    }
    return input
  }

  if (typeof input !== 'object') {
    throw new TypeError('value is not JSON-compatible')
  }

  if (ancestors.has(input)) {
    throw new TypeError('JSON values cannot contain cycles')
  }

  const nextAncestors = new Set(ancestors)
  nextAncestors.add(input)

  if (Array.isArray(input)) {
    return Object.freeze(
      input.map((item) => cloneJsonValue(item, nextAncestors)),
    )
  }

  const prototype = Object.getPrototypeOf(input) as object | null
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('JSON objects must be plain objects')
  }

  if (Object.getOwnPropertySymbols(input).length > 0) {
    throw new TypeError('JSON objects cannot contain symbol keys')
  }

  const output: Record<string, DeepReadonly<JsonValue>> = {}
  for (const key of Object.keys(input)) {
    Object.defineProperty(output, key, {
      configurable: false,
      enumerable: true,
      value: cloneJsonValue(
        (input as Record<string, unknown>)[key],
        nextAncestors,
      ),
      writable: false,
    })
  }

  return Object.freeze(output)
}

export const cloneJsonObject = <TContext extends JsonObject>(
  input: unknown,
): DeepReadonly<TContext> => {
  const cloned = cloneJsonValue(input, new Set())
  if (cloned === null || Array.isArray(cloned) || typeof cloned !== 'object') {
    throw new TypeError('statechart context must be a JSON object')
  }
  return cloned as DeepReadonly<TContext>
}
