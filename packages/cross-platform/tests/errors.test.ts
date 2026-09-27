import { AgentsKitError } from '@agentskit/core'
import { describe, expect, it } from 'vitest'
import {
  CrossPlatformError,
  CrossPlatformErrorCodes,
  isNotFoundError,
  isPermissionError,
  mapRuntimeError,
  permissionDenied,
} from '../src/errors'

describe('errors', () => {
  it('is an AgentsKitError with a stable code and docs link', () => {
    const error = new CrossPlatformError({ code: CrossPlatformErrorCodes.AK_PLATFORM_SPAWN_FAILED, message: 'boom' })
    expect(error).toBeInstanceOf(AgentsKitError)
    expect(error.name).toBe('CrossPlatformError')
    expect(error.code).toBe('AK_PLATFORM_SPAWN_FAILED')
    expect(error.docsUrl).toContain('cross-platform')
  })

  it('recognises Deno permission errors by name', () => {
    expect(isPermissionError(Object.assign(new Error('x'), { name: 'NotCapable' }))).toBe(true)
    expect(isPermissionError(Object.assign(new Error('x'), { name: 'PermissionDenied' }))).toBe(true)
    expect(isPermissionError(new Error('x'))).toBe(false)
    expect(isPermissionError('NotCapable')).toBe(false)
    expect(isPermissionError(null)).toBe(false)
  })

  it('recognises not-found errors from Node and Deno', () => {
    expect(isNotFoundError(Object.assign(new Error('x'), { code: 'ENOENT' }))).toBe(true)
    expect(isNotFoundError(Object.assign(new Error('x'), { name: 'NotFound' }))).toBe(true)
    expect(isNotFoundError(Object.assign(new Error('x'), { code: 42 }))).toBe(false)
    expect(isNotFoundError(undefined)).toBe(false)
  })

  it('names the missing --allow flag', () => {
    const error = permissionDenied('run', 'git', new Error('denied'))
    expect(error.code).toBe(CrossPlatformErrorCodes.AK_PLATFORM_PERMISSION_DENIED)
    expect(error.hint).toContain('--allow-run=git')
  })

  it('maps only permission errors', () => {
    const denied = Object.assign(new Error('x'), { name: 'NotCapable' })
    expect(mapRuntimeError(denied, 'read', '/x')).toBeInstanceOf(CrossPlatformError)
    const other = new Error('other')
    expect(mapRuntimeError(other, 'read', '/x')).toBe(other)
  })
})
