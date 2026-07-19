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
    return Object.is(input, -0) ? 0 : input
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
    if (Object.getOwnPropertySymbols(input).length > 0) {
      throw new TypeError('JSON arrays cannot contain symbol keys')
    }
    const names = Object.getOwnPropertyNames(input)
    const indices = names.filter((key) => key !== 'length')
    if (indices.length !== input.length) {
      throw new TypeError('JSON arrays must be dense and contain only indexed values')
    }
    for (let index = 0; index < input.length; index += 1) {
      const key = String(index)
      if (indices[index] !== key) {
        throw new TypeError('JSON arrays must be dense and contain only indexed values')
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key)
      if (!descriptor || !('value' in descriptor)) {
        throw new TypeError('JSON arrays cannot contain accessors')
      }
    }
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

  const names = Object.getOwnPropertyNames(input)
  const output: Record<string, DeepReadonly<JsonValue>> = {}
  for (const key of names) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor || !('value' in descriptor)) {
      throw new TypeError('JSON objects cannot contain accessors')
    }
    if (!descriptor.enumerable) {
      throw new TypeError('JSON objects cannot contain non-enumerable properties')
    }
    Object.defineProperty(output, key, {
      configurable: false,
      enumerable: true,
      value: cloneJsonValue(
        descriptor.value,
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
