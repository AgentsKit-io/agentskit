export function cloneJsonRecord(
  input: unknown,
  invalid: () => never,
  maxStringLength = Infinity,
  preflight = true,
): Record<string, unknown> {
  const assertJson = (root: unknown): void => {
    const active = new WeakSet<object>()
    const stack: Array<{ value: unknown; depth: number; exit?: boolean }> = [{ value: root, depth: 0 }]
    let nodes = 0
    while (stack.length > 0) {
      const item = stack.pop()!
      const value = item.value
      if (item.exit) { active.delete(value as object); continue }
      if (++nodes > 10_000 || item.depth > 32) invalid()
      if (value === null || typeof value === 'boolean') continue
      if (typeof value === 'string') { if (value.length > maxStringLength) invalid(); continue }
      if (typeof value === 'number') { if (!Number.isFinite(value)) invalid(); continue }
      if (typeof value !== 'object') invalid()
      const isArray = Array.isArray(value)
      const prototype = isArray ? Array.prototype : Object.getPrototypeOf(value) as unknown
      if (!isArray && prototype !== Object.prototype && prototype !== null) invalid()
      if (active.has(value)) invalid()
      active.add(value)
      stack.push({ value, depth: item.depth, exit: true })
      if (isArray) {
        const array = value as unknown[]
        if (array.length > 10_000) invalid()
        for (let index = array.length - 1; index >= 0; index--) {
          stack.push({ value: array[index], depth: item.depth + 1 })
        }
        continue
      }
      const keys = Object.keys(value)
      if (keys.length > 10_000) invalid()
      for (let index = keys.length - 1; index >= 0; index--) {
        const key = keys[index]!
        if (key.length > 256) invalid()
        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        if (!descriptor || descriptor.get || descriptor.set) invalid()
        stack.push({ value: descriptor.value, depth: item.depth + 1 })
      }
    }
  }
  try {
    if (preflight) assertJson(input)
    const snapshot = structuredClone(input) as unknown
    assertJson(snapshot)
    if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) invalid()
    return snapshot as Record<string, unknown>
  } catch {
    return invalid()
  }
}
