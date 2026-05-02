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

  it('scaffolds a vector-memory package', async () => {
    await scaffold({ type: 'memory-vector', name: 'pinedrop', dir })
    const src = await readFile(join(dir, 'pinedrop', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('VectorMemory')
    expect(src).toContain('PinedropConfig')
    expect(src).toContain('AK_MEMORY_REMOTE_HTTP')
    expect(src).toContain('async store')
    expect(src).toContain('async search')
    expect(src).toContain('async delete')
  })

  it('scaffolds a chat-memory package', async () => {
    await scaffold({ type: 'memory-chat', name: 'turso-lite', dir })
    const src = await readFile(join(dir, 'turso-lite', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('ChatMemory')
    expect(src).toContain('TursoLiteConfig')
    expect(src).toContain('serializeMessages')
    expect(src).toContain('AK_MEMORY_LOAD_FAILED')
    expect(src).toContain('AK_MEMORY_SAVE_FAILED')
  })

  it('scaffolds a flow package with yaml + registry + README', async () => {
    await scaffold({ type: 'flow', name: 'nightly-refresh', dir })
    const src = await readFile(join(dir, 'nightly-refresh', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('FlowRegistry')
    expect(src).toContain('nightlyRefreshRegistry')
    expect(src).toContain("'http.get'")
    expect(src).toContain("'json.parse'")

    const yaml = await readFile(join(dir, 'nightly-refresh', 'flow.yaml'), 'utf8')
    expect(yaml).toContain('name: nightly-refresh')
    expect(yaml).toContain('nodes:')
    expect(yaml).toContain('run: http.get')
    expect(yaml).toContain('needs: [fetch]')

    const readme = await readFile(join(dir, 'nightly-refresh', 'README.md'), 'utf8')
    expect(readme).toContain('agentskit flow validate')
    expect(readme).toContain('compileFlow')

    const test = await readFile(join(dir, 'nightly-refresh', 'tests', 'index.test.ts'), 'utf8')
    expect(test).toContain('compileFlow')
    expect(test).toContain('@agentskit/runtime')
  })

  it('scaffolds an embedder package', async () => {
    await scaffold({ type: 'embedder', name: 'voyage-mini', dir })
    const src = await readFile(join(dir, 'voyage-mini', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('EmbedFn')
    expect(src).toContain('VoyageMiniEmbedderConfig')
    expect(src).toContain('voyageMiniEmbedder')

    const pkg = JSON.parse(await readFile(join(dir, 'voyage-mini', 'package.json'), 'utf8'))
    expect(pkg.dependencies['@agentskit/adapters']).toBe('*')
  })

  it('scaffolds a browser-adapter package', async () => {
    await scaffold({ type: 'browser-adapter', name: 'mlc-mini', dir })
    const src = await readFile(join(dir, 'mlc-mini', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('AdapterFactory')
    expect(src).toContain('MlcMiniConfig')
    expect(src).toContain("capabilities: { tools: false }")
    expect(src).toContain('chat.completions.create')
  })

  it('memory-vector scaffold gets @agentskit/memory dependency', async () => {
    await scaffold({ type: 'memory-vector', name: 'fast-store', dir })
    const pkg = JSON.parse(await readFile(join(dir, 'fast-store', 'package.json'), 'utf8'))
    expect(pkg.dependencies['@agentskit/memory']).toBe('*')
    expect(pkg.dependencies['@agentskit/core']).toBe('*')
  })

  it('flow scaffold gets @agentskit/runtime dependency', async () => {
    await scaffold({ type: 'flow', name: 'nightly-2', dir })
    const pkg = JSON.parse(await readFile(join(dir, 'nightly-2', 'package.json'), 'utf8'))
    expect(pkg.dependencies['@agentskit/runtime']).toBe('*')
  })

  it('plain tool scaffold gets only @agentskit/core', async () => {
    await scaffold({ type: 'tool', name: 'plain-tool', dir })
    const pkg = JSON.parse(await readFile(join(dir, 'plain-tool', 'package.json'), 'utf8'))
    expect(Object.keys(pkg.dependencies)).toEqual(['@agentskit/core'])
  })
})
