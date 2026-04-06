import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig } from '../src/config'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('loadConfig', () => {
  let dir: string

  beforeEach(async () => {
    dir = join(tmpdir(), `agentskit-config-${Date.now()}`)
    await mkdir(dir, { recursive: true })
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  })

  it('returns undefined when no config file exists', async () => {
    const config = await loadConfig({ cwd: dir })
    expect(config).toBeUndefined()
  })

  it('loads .agentskit.config.json', async () => {
    await writeFile(join(dir, '.agentskit.config.json'), JSON.stringify({
      tools: { filesystem: { basePath: './workspace' } },
      defaults: { provider: 'openai', model: 'gpt-4o' },
    }))

    const config = await loadConfig({ cwd: dir })
    expect(config).toBeDefined()
    expect(config!.tools?.filesystem?.basePath).toBe('./workspace')
    expect(config!.defaults?.provider).toBe('openai')
    expect(config!.defaults?.model).toBe('gpt-4o')
  })

  it('loads from package.json agentskit field', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({
      name: 'test-project',
      agentskit: {
        defaults: { provider: 'anthropic' },
        runtime: { maxSteps: 5 },
      },
    }))

    const config = await loadConfig({ cwd: dir })
    expect(config).toBeDefined()
    expect(config!.defaults?.provider).toBe('anthropic')
    expect(config!.runtime?.maxSteps).toBe(5)
  })

  it('JSON config takes precedence over package.json', async () => {
    await writeFile(join(dir, '.agentskit.config.json'), JSON.stringify({
      defaults: { provider: 'openai' },
    }))
    await writeFile(join(dir, 'package.json'), JSON.stringify({
      name: 'test',
      agentskit: { defaults: { provider: 'anthropic' } },
    }))

    const config = await loadConfig({ cwd: dir })
    expect(config!.defaults?.provider).toBe('openai')
  })

  it('handles malformed JSON gracefully', async () => {
    await writeFile(join(dir, '.agentskit.config.json'), 'not json {{{')

    const config = await loadConfig({ cwd: dir })
    expect(config).toBeUndefined()
  })

  it('loads full config with all fields', async () => {
    await writeFile(join(dir, '.agentskit.config.json'), JSON.stringify({
      tools: {
        filesystem: { basePath: './work' },
        shell: { allowed: ['ls', 'cat'], timeout: 5000 },
        webSearch: { provider: 'serper', maxResults: 3 },
      },
      defaults: { provider: 'gemini', model: 'gemini-2.5-flash' },
      runtime: { maxSteps: 15, maxDelegationDepth: 2 },
      observability: { console: { format: 'json' } },
    }))

    const config = await loadConfig({ cwd: dir })
    expect(config!.tools?.shell?.allowed).toEqual(['ls', 'cat'])
    expect(config!.tools?.shell?.timeout).toBe(5000)
    expect(config!.runtime?.maxDelegationDepth).toBe(2)
    expect(config!.observability?.console).toEqual({ format: 'json' })
  })

  it('ignores unknown fields (lenient)', async () => {
    await writeFile(join(dir, '.agentskit.config.json'), JSON.stringify({
      defaults: { provider: 'openai' },
      futureFeature: { enabled: true },
    }))

    const config = await loadConfig({ cwd: dir })
    expect(config!.defaults?.provider).toBe('openai')
    // Unknown field is preserved (not stripped)
    expect((config as Record<string, unknown>).futureFeature).toBeDefined()
  })

  it('package.json without agentskit field returns undefined', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({
      name: 'test', version: '1.0.0',
    }))

    const config = await loadConfig({ cwd: dir })
    expect(config).toBeUndefined()
  })
})
