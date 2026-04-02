import { useRef, useSyncExternalStore, useCallback } from 'react'

export function useReactive<T extends Record<string, unknown>>(initialState: T): T {
  const storeRef = useRef<{
    state: T
    listeners: Set<() => void>
    proxy: T
    version: number
  } | null>(null)

  if (storeRef.current === null) {
    const store = {
      state: { ...initialState },
      listeners: new Set<() => void>(),
      proxy: null as unknown as T,
      version: 0,
    }

    const notify = () => {
      store.version++
      store.listeners.forEach(listener => listener())
    }

    store.proxy = new Proxy(store.state, {
      get(target, prop, receiver) {
        return Reflect.get(target, prop, receiver)
      },
      set(target, prop, value, receiver) {
        const result = Reflect.set(target, prop, value, receiver)
        notify()
        return result
      },
    }) as T

    storeRef.current = store
  }

  const store = storeRef.current

  const subscribe = useCallback((callback: () => void) => {
    store.listeners.add(callback)
    return () => { store.listeners.delete(callback) }
  }, [store])

  const getSnapshot = useCallback(() => store.version, [store])

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return store.proxy
}
