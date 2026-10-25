/** Mutable key-value context that can be shared across tools in one run. */
export interface SharedContext {
  get(key: string): unknown
  set(key: string, value: unknown): void
  has(key: string): boolean
  entries(): Record<string, unknown>
  readOnly(): ReadonlySharedContext
}

/** Read-only view of shared context values. */
export interface ReadonlySharedContext {
  get(key: string): unknown
  has(key: string): boolean
  entries(): Record<string, unknown>
}

/** Create shared context initialized from an optional object. @param initial Initial key-value pairs. @returns Context with read and write operations. @example `const context = createSharedContext({ userId: 'u1' })` */
export function createSharedContext(
  initial?: Record<string, unknown>,
): SharedContext {
  const store = new Map<string, unknown>(
    initial ? Object.entries(initial) : [],
  )

  return {
    get(key) { return store.get(key) },
    set(key, value) { store.set(key, value) },
    has(key) { return store.has(key) },
    entries() { return Object.fromEntries(store) },
    readOnly() {
      return {
        get(key: string) { return store.get(key) },
        has(key: string) { return store.has(key) },
        entries() { return Object.fromEntries(store) },
      }
    },
  }
}
