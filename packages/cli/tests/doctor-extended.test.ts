/**
 * Extended doctor.ts tests — covers:
 * - checkPnpm bun detection (line 80)
 * - checkPnpm npm warn (line 75)
 * - renderReport with network results (line 301)
 * - checkConfig null config (line 206) and error (line 214)
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderReport, checkConfig } from '../src/doctor'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkPnpm — bun detection', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agentskit-doc-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns pass for bun.lock', async () => {
    writeFileSync(join(dir, 'bun.lock'), '')
    vi.spyOn(process, 'cwd').mockReturnValue(dir)

    const { runDoctor } = await import('../src/doctor')
    const report = await runDoctor({ noNetwork: true })

    const pmCheck = report.results.find(r => r.name === 'Package manager')
    expect(pmCheck).toBeDefined()
    expect(pmCheck!.status).toBe('pass')
    expect(pmCheck!.detail).toContain('bun')
  })

  it('returns pass for bun.lockb (binary lockfile)', async () => {
    writeFileSync(join(dir, 'bun.lockb'), '')
    vi.spyOn(process, 'cwd').mockReturnValue(dir)

    const { runDoctor } = await import('../src/doctor')
    const report = await runDoctor({ noNetwork: true })

    const pmCheck = report.results.find(r => r.name === 'Package manager')
    expect(pmCheck?.detail).toContain('bun')
  })

  it('returns warn for package-lock.json (npm detected)', async () => {
    writeFileSync(join(dir, 'package-lock.json'), '{}')
    vi.spyOn(process, 'cwd').mockReturnValue(dir)

    const { runDoctor } = await import('../src/doctor')
    const report = await runDoctor({ noNetwork: true })

    const pmCheck = report.results.find(r => r.name === 'Package manager')
    expect(pmCheck).toBeDefined()
    expect(pmCheck!.status).toBe('warn')
    expect(pmCheck!.detail).toContain('npm')
  })
})

describe('renderReport — with network results (line 301)', () => {
  it('places "reachable" results in Network section', () => {
    const report = {
      results: [
        { status: 'pass' as const, name: 'openai reachable', detail: 'ok' },
        { status: 'skip' as const, name: 'Node version', detail: 'ok' },
        { status: 'pass' as const, name: 'OPENAI API key', detail: 'ok' },
      ],
      pass: 2,
      warn: 0,
      fail: 0,
      skip: 1,
    }

    const out = renderReport(report)
    expect(out).toContain('Network')
    expect(out).toContain('openai reachable')
  })

  it('includes all status symbols in the report', () => {
    const report = {
      results: [
        { status: 'pass' as const, name: 'A', detail: 'ok' },
        { status: 'warn' as const, name: 'B', detail: 'warn', fix: 'fix it' },
        { status: 'fail' as const, name: 'C', detail: 'bad', fix: 'fix this' },
        { status: 'skip' as const, name: 'D', detail: 'skipped' },
      ],
      pass: 1,
      warn: 1,
      fail: 1,
      skip: 1,
    }
    const out = renderReport(report)
    expect(out.length).toBeGreaterThan(0)
    // All statuses should appear
    expect(out).toContain('A')
    expect(out).toContain('B')
    expect(out).toContain('C')
    expect(out).toContain('D')
  })
})

describe('checkConfig — via doctor module directly', () => {
  it('includes AgentsKit config check in report results', async () => {
    const { runDoctor } = await import('../src/doctor')
    const report = await runDoctor({ noNetwork: true })
    const cfgCheck = report.results.find(r => r.name === 'AgentsKit config')
    expect(cfgCheck).toBeDefined()
    expect(['skip', 'pass', 'warn', 'fail']).toContain(cfgCheck!.status)
  })
})

describe('checkPackageJson — no agentskit deps (line 108) and parse error (line 116)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agentskit-doc-pkg-'))
    vi.spyOn(process, 'cwd').mockReturnValue(dir)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns skip when package.json has no @agentskit/* deps (line 108)', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { react: '^18.0.0' } }))
    const { checkPackageJson } = await import('../src/doctor')
    const result = await checkPackageJson()
    expect(result.status).toBe('skip')
    expect(result.name).toBe('AgentsKit packages')
    expect(result.detail).toContain('No @agentskit')
  })

  it('returns fail when package.json is invalid JSON (line 116)', async () => {
    writeFileSync(join(dir, 'package.json'), 'NOT_JSON{{{')
    const { checkPackageJson } = await import('../src/doctor')
    const result = await checkPackageJson()
    expect(result.status).toBe('fail')
    expect(result.name).toBe('package.json')
    expect(result.detail).toContain('Could not parse')
  })
})

describe('checkProviderReachable — 200 OK and unexpected status (lines 175, 180)', () => {
  it('returns pass when fetch returns 200 (line 175)', async () => {
    const { checkProviderReachable } = await import('../src/doctor')
    const mockFetch = vi.fn().mockResolvedValue({ status: 200 } as Response)
    const result = await checkProviderReachable('ollama', mockFetch as typeof fetch)
    expect(result.status).toBe('pass')
    expect(result.detail).toContain('200 OK')
  })

  it('returns warn when fetch returns unexpected status e.g. 429 (line 180)', async () => {
    const { checkProviderReachable } = await import('../src/doctor')
    const mockFetch = vi.fn().mockResolvedValue({ status: 429 } as Response)
    const result = await checkProviderReachable('ollama', mockFetch as typeof fetch)
    expect(result.status).toBe('warn')
    expect(result.detail).toContain('429')
  })
})

describe('checkConfig — null config (line 206)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns skip when loadConfig returns null', async () => {
    vi.doMock('../src/config', () => ({
      loadConfig: vi.fn().mockResolvedValue(null),
    }))

    const { checkConfig: checkConfigFn } = await import('../src/doctor')
    const result = await checkConfigFn()
    expect(result.status).toBe('skip')
    expect(result.name).toBe('AgentsKit config')
    expect(result.detail).toContain('No .agentskit')
  })

  it('returns warn when loadConfig throws (line 214)', async () => {
    vi.doMock('../src/config', () => ({
      loadConfig: vi.fn().mockRejectedValue(new Error('parse error')),
    }))

    const { checkConfig: checkConfigFn } = await import('../src/doctor')
    const result = await checkConfigFn()
    expect(result.status).toBe('warn')
    expect(result.detail).toContain('parse error')
  })
})
