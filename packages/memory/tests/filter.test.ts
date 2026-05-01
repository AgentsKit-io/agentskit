import { describe, it, expect } from 'vitest'
import { matchesFilter } from '../src/vector/filter'

describe('matchesFilter', () => {
  it('passes when filter is undefined', () => {
    expect(matchesFilter({ x: 1 }, undefined)).toBe(true)
  })

  it('matches primitive shorthand as $eq', () => {
    expect(matchesFilter({ tag: 'docs' }, { tag: 'docs' })).toBe(true)
    expect(matchesFilter({ tag: 'docs' }, { tag: 'rag' })).toBe(false)
  })

  it('handles $eq / $ne', () => {
    expect(matchesFilter({ x: 1 }, { x: { $eq: 1 } })).toBe(true)
    expect(matchesFilter({ x: 1 }, { x: { $ne: 2 } })).toBe(true)
    expect(matchesFilter({ x: 1 }, { x: { $ne: 1 } })).toBe(false)
  })

  it('handles $in / $nin', () => {
    expect(matchesFilter({ tag: 'a' }, { tag: { $in: ['a', 'b'] } })).toBe(true)
    expect(matchesFilter({ tag: 'c' }, { tag: { $in: ['a', 'b'] } })).toBe(false)
    expect(matchesFilter({ tag: 'a' }, { tag: { $nin: ['x'] } })).toBe(true)
  })

  it('handles $gt / $gte / $lt / $lte numerically', () => {
    expect(matchesFilter({ v: 5 }, { v: { $gt: 4 } })).toBe(true)
    expect(matchesFilter({ v: 5 }, { v: { $gte: 5 } })).toBe(true)
    expect(matchesFilter({ v: 5 }, { v: { $lt: 5 } })).toBe(false)
    expect(matchesFilter({ v: 5 }, { v: { $lte: 5 } })).toBe(true)
  })

  it('handles $exists', () => {
    expect(matchesFilter({ x: 1 }, { x: { $exists: true } })).toBe(true)
    expect(matchesFilter({}, { x: { $exists: true } })).toBe(false)
    expect(matchesFilter({}, { x: { $exists: false } })).toBe(true)
  })

  it('AND across fields by default', () => {
    expect(matchesFilter({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(matchesFilter({ a: 1, b: 3 }, { a: 1, b: 2 })).toBe(false)
  })

  it('explicit $and', () => {
    expect(matchesFilter({ a: 1, b: 2 }, { $and: [{ a: 1 }, { b: 2 }] })).toBe(true)
    expect(matchesFilter({ a: 1, b: 3 }, { $and: [{ a: 1 }, { b: 2 }] })).toBe(false)
  })

  it('explicit $or', () => {
    expect(matchesFilter({ a: 1 }, { $or: [{ a: 1 }, { b: 2 }] })).toBe(true)
    expect(matchesFilter({ b: 2 }, { $or: [{ a: 1 }, { b: 2 }] })).toBe(true)
    expect(matchesFilter({ a: 9 }, { $or: [{ a: 1 }, { b: 2 }] })).toBe(false)
  })

  it('handles missing metadata gracefully', () => {
    expect(matchesFilter(undefined, { x: 1 })).toBe(false)
    expect(matchesFilter(undefined, undefined)).toBe(true)
  })
})
