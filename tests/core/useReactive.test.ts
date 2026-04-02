import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReactive } from '../../src/core/useReactive'

describe('useReactive', () => {
  it('returns a proxy with initial state values', () => {
    const { result } = renderHook(() => useReactive({ count: 0, name: 'test' }))
    expect(result.current.count).toBe(0)
    expect(result.current.name).toBe('test')
  })

  it('triggers re-render when a property is mutated', () => {
    let renderCount = 0
    const { result } = renderHook(() => {
      renderCount++
      return useReactive({ count: 0 })
    })

    const before = renderCount
    act(() => {
      result.current.count = 5
    })

    expect(renderCount).toBeGreaterThan(before)
    expect(result.current.count).toBe(5)
  })

  it('supports nested object mutation', () => {
    const { result } = renderHook(() =>
      useReactive({ user: { name: 'Alice' } })
    )

    act(() => {
      result.current.user = { name: 'Bob' }
    })

    expect(result.current.user.name).toBe('Bob')
  })

  it('supports array operations', () => {
    const { result } = renderHook(() =>
      useReactive({ items: ['a', 'b'] })
    )

    act(() => {
      result.current.items = [...result.current.items, 'c']
    })

    expect(result.current.items).toEqual(['a', 'b', 'c'])
  })

  it('preserves the same proxy reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useReactive({ count: 0 }))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
