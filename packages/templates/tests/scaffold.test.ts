import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { scaffold } from '../src/scaffold'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('scaffold', () => {
  let dir: string

  beforeEach(() => {
    dir = join(tmpdir(), `agentskit-scaffold-${Date.now()}`)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  })

  it('scaffolds a tool package', async () => {
    const files = await scaffold({ type: 'tool', name: 'my-search', dir })

    expect(files.length).toBeGreaterThanOrEqual(5)

    const pkg = JSON.parse(await readFile(join(dir, 'my-search', 'package.json'), 'utf8'))
    expect(pkg.name).toBe('agentskit-my-search')
    expect(pkg.dependencies['@agentskit/core']).toBeTruthy()

    const src = await readFile(join(dir, 'my-search', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('ToolDefinition')
    expect(src).toContain("name: 'my-search'")

    const test = await readFile(join(dir, 'my-search', 'tests', 'index.test.ts'), 'utf8')
    expect(test).toContain('ToolDefinition')
  })

  it('scaffolds a skill package', async () => {
    const files = await scaffold({ type: 'skill', name: 'analyst', dir })

    const src = await readFile(join(dir, 'analyst', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('SkillDefinition')
    expect(src).toContain("name: 'analyst'")
    expect(src).toContain('systemPrompt')
  })

  it('scaffolds an adapter package', async () => {
    const files = await scaffold({ type: 'adapter', name: 'my-llm', dir })

    const src = await readFile(join(dir, 'my-llm', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('AdapterFactory')
    expect(src).toContain('createSource')
    expect(src).toContain('MyLlmConfig')
  })

  it('generates valid package.json', async () => {
    await scaffold({ type: 'tool', name: 'test-tool', dir })

    const pkg = JSON.parse(await readFile(join(dir, 'test-tool', 'package.json'), 'utf8'))
    expect(pkg.type).toBe('module')
    expect(pkg.publishConfig.access).toBe('public')
    expect(pkg.scripts.build).toBe('tsup')
    expect(pkg.scripts.test).toBe('vitest run')
  })

  it('generates README with package name', async () => {
    await scaffold({ type: 'skill', name: 'writer', dir, description: 'A writing skill' })

    const readme = await readFile(join(dir, 'writer', 'README.md'), 'utf8')
    expect(readme).toContain('agentskit-writer')
    expect(readme).toContain('A writing skill')
  })

  it('uses custom description', async () => {
    await scaffold({ type: 'tool', name: 'slack', dir, description: 'Send Slack messages from agents' })

    const pkg = JSON.parse(await readFile(join(dir, 'slack', 'package.json'), 'utf8'))
    expect(pkg.description).toBe('Send Slack messages from agents')
  })
})
