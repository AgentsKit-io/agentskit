import { describe, expect, it } from 'vitest'
import {
  SandboxRegistry,
  WeakSandboxError,
  assertStrongIsolation,
  isStrongIsolation,
  isWeakIsolation,
  weakSandboxBanner,
} from '../src/index'

describe('SandboxRegistry', () => {
  it('ships none + process builtins', () => {
    const reg = new SandboxRegistry()
    expect(reg.has('none')).toBe(true)
    expect(reg.has('process')).toBe(true)
    expect(reg.list()).toEqual(expect.arrayContaining(['none', 'process']))
  })

  it('throws for an unregistered level', () => {
    const reg = new SandboxRegistry(false)
    expect(() => reg.resolveOrThrow('container')).toThrow(/no sandbox runtime registered/)
  })
})

describe('strictness', () => {
  it('classifies isolation strength', () => {
    expect(isStrongIsolation('container')).toBe(true)
    expect(isWeakIsolation('process')).toBe(true)
    expect(isStrongIsolation('process')).toBe(false)
  })

  it('throws WeakSandboxError for weak levels unless opted in', () => {
    expect(() => assertStrongIsolation('process')).toThrow(WeakSandboxError)
    expect(() => assertStrongIsolation('process', { allowWeak: true })).not.toThrow()
    expect(() => assertStrongIsolation('container')).not.toThrow()
  })

  it('renders a stderr banner', () => {
    expect(weakSandboxBanner('process')).toContain('no OS-level fs/net isolation')
  })
})
