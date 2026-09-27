import { describe, expect, it } from 'vitest'
import { getRuntimeInfo, isBun, isDeno, isWindows } from '../src/runtime'

describe('runtime detection', () => {
  it('detects Node under vitest', () => {
    const info = getRuntimeInfo()
    expect(info.runtime).toBe('node')
    expect(info.isServer).toBe(true)
    expect(info.platform).toBe(process.platform)
    expect(isBun).toBe(false)
    expect(isDeno).toBe(false)
  })

  it('maps the OS family', () => {
    const expected: Record<string, string> = { win32: 'windows', darwin: 'macos', linux: 'linux' }
    expect(getRuntimeInfo().os).toBe(expected[process.platform] ?? 'unknown')
    expect(isWindows).toBe(process.platform === 'win32')
  })
})
