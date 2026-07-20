/**
 * Defensive structural snapshot for in-memory replay data.
 * Clones arrays, plain objects, and Date; preserves functions and opaque
 * objects by identity; breaks cycles without JSON serialization.
 */
export function defensiveSnapshot<T>(value: T): T {
  const seen = new WeakMap<object, unknown>()

  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v
    if (typeof v === 'function') return v

    const obj = v as object
    const cached = seen.get(obj)
    if (cached !== undefined) return cached

    if (v instanceof Date) {
      const d = new Date(v.getTime())
      seen.set(obj, d)
      return d
    }

    if (Array.isArray(v)) {
      const out: unknown[] = []
      seen.set(obj, out)
      for (const item of v) out.push(walk(item))
      return out
    }

    const proto = Object.getPrototypeOf(v)
    if (proto !== Object.prototype && proto !== null) {
      // Opaque host objects (Map, Set, class instances, etc.) — preserve identity.
      return v
    }

    const src = v as Record<string, unknown>
    const out: Record<string, unknown> = {}
    seen.set(obj, out)
    for (const key of Object.keys(src)) {
      Object.defineProperty(out, key, {
        value: walk(src[key]),
        writable: true,
        enumerable: true,
        configurable: true,
      })
    }
    return out
  }

  return walk(value) as T
}
