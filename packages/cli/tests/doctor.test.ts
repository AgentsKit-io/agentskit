import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  checkNodeVersion,
  checkProviderEnv,
  checkProviderReachable,
  runDoctor,
  renderReport,
} from '../src/doctor'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
})

describe('checkNodeVersion', () => {
  it('passes on Node 22+', async () => {
    const result = await checkNodeVersion()
    expect(result.status).toMatch(/pass|warn/)
    expect(result.name).toBe('Node version')
  })
})

describe('checkProviderEnv', () => {
  it('skips when the env key is unset', async () => {
    delete process.env.OPENAI_API_KEY
    const result = await checkProviderEnv('openai')
    expect(result.status).toBe('skip')
    expect(result.fix).toContain('OPENAI_API_KEY')
  })

  it('warns when the key looks suspiciously short', async () => {
    process.env.OPENAI_API_KEY = 'sk-short'
    const result = await checkProviderEnv('openai')
    expect(result.status).toBe('warn')
  })

  it('passes on a normal-length key', async () => {
    process.env.OPENAI_API_KEY = 'sk-' + 'x'.repeat(40)
    const result = await checkProviderEnv('openai')
    expect(result.status).toBe('pass')
  })

  it('skips providers with no env requirement', async () => {
    const result = await checkProviderEnv('ollama')
    expect(result.status).toBe('skip')
  })
})

describe('checkProviderReachable', () => {
  beforeEach(() => {
    // Reachability checks require the API key to be set
    process.env.OPENAI_API_KEY = 'sk-test-key-for-reach'
  })

  it('reports pass when fetch resolves with 401', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ status: 401 } as Response)
    const result = await checkProviderReachable('openai', fakeFetch as unknown as typeof fetch)
    expect(result.status).toBe('pass')
    expect(result.detail).toContain('401')
  })

  it('reports fail on network error', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'))
    const result = await checkProviderReachable('openai', fakeFetch as unknown as typeof fetch)
    expect(result.status).toBe('fail')
    expect(result.fix).toBeTruthy()
  })

  it('skips providers with no URL configured', async () => {
    const result = await checkProviderReachable('demo')
    expect(result.status).toBe('skip')
  })

  it('skips when no API key is set', async () => {
    delete process.env.OPENAI_API_KEY
    const fakeFetch = vi.fn()
    const result = await checkProviderReachable('openai', fakeFetch as unknown as typeof fetch)
    expect(result.status).toBe('skip')
    expect(fakeFetch).not.toHaveBeenCalled()
  })

  it('treats an abort as a fail with timeout context', async () => {
    const fakeFetch = vi.fn().mockImplementation(() => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })
    const result = await checkProviderReachable('openai', fakeFetch as unknown as typeof fetch)
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('timeout')
  })
})

describe('runDoctor', () => {
  it('aggregates results and counts statuses', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ status: 200 } as Response)
    const report = await runDoctor({
      providers: ['openai'],
      fetchImpl: fakeFetch as unknown as typeof fetch,
    })
    expect(report.results.length).toBeGreaterThan(0)
    expect(report.pass + report.warn + report.fail + report.skip).toBe(report.results.length)
  })

  it('skips network checks when noNetwork is set', async () => {
    const fakeFetch = vi.fn()
    const report = await runDoctor({
      providers: ['openai'],
      noNetwork: true,
      fetchImpl: fakeFetch as unknown as typeof fetch,
    })
    expect(fakeFetch).not.toHaveBeenCalled()
    // No reachability rows when noNetwork
    expect(report.results.find(r => r.name === 'openai reachable')).toBeUndefined()
  })
})

describe('renderReport', () => {
  it('produces a TTY-friendly summary', () => {
    const out = renderReport(
      {
        results: [
          { status: 'pass', name: 'Node version', detail: 'Node 22.x' },
          { status: 'fail', name: 'OPENAI_API_KEY', detail: 'unset', fix: 'export OPENAI_API_KEY=...' },
        ],
        pass: 1,
        warn: 0,
        fail: 1,
        skip: 0,
      },
      { color: false },
    )
    expect(out).toContain('AgentsKit Doctor')
    expect(out).toContain('Node version')
    expect(out).toContain('OPENAI_API_KEY')
    expect(out).toContain('export OPENAI_API_KEY=...')
    expect(out).toContain('1 passed')
    expect(out).toContain('1 failed')
  })
})
