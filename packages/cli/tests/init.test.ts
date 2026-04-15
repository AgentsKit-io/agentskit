import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { renderChatHeader } from '../src/chat'
import { writeStarterProject } from '../src/init'
import { resolveChatProvider } from '../src/providers'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('@agentskit/cli', () => {
  it('renders a short chat header', () => {
    expect(renderChatHeader({ provider: 'demo', model: 'test' })).toContain('provider=demo')
  })

  it('writes a react starter project', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'react' })

    const packageJson = await readFile(path.join(tempDir, 'package.json'), 'utf8')
    const appFile = await readFile(path.join(tempDir, 'src/App.tsx'), 'utf8')
    const mainFile = await readFile(path.join(tempDir, 'src/main.tsx'), 'utf8')

    expect(packageJson).toContain('@agentskit/react')
    expect(appFile).toContain('useChat')
    expect(mainFile).toContain('createRoot')
  })

  it('uses environment variables for openai', () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const runtime = resolveChatProvider({ provider: 'openai' })

    expect(runtime.mode).toBe('live')
    expect(runtime.model).toBe('gpt-4o-mini')
  })

  it('throws a helpful error when a provider key is missing', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => resolveChatProvider({ provider: 'anthropic' })).toThrow('ANTHROPIC_API_KEY')
  })

  it('supports ollama without an API key', () => {
    const runtime = resolveChatProvider({ provider: 'ollama' })
    expect(runtime.mode).toBe('live')
    expect(runtime.model).toBe('llama3.1')
  })

  it('writes an ink starter with a demo adapter', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'ink', provider: 'demo' })

    const file = await readFile(path.join(tempDir, 'src/index.tsx'), 'utf8')
    expect(file).toContain("from '@agentskit/ink'")
    expect(file).toContain('demoAdapter')
    expect(file).not.toContain('@agentskit/adapters')
  })

  it('writes a runtime starter wired to OpenAI', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({
      targetDir: tempDir,
      template: 'runtime',
      provider: 'openai',
      tools: ['web_search', 'filesystem'],
      memory: 'sqlite',
    })

    const file = await readFile(path.join(tempDir, 'src/index.ts'), 'utf8')
    expect(file).toContain("import { createRuntime } from '@agentskit/runtime'")
    expect(file).toContain("openai({")
    expect(file).toContain('webSearch()')
    expect(file).toContain('filesystem({')
    expect(file).toContain('sqliteChatMemory')

    const env = await readFile(path.join(tempDir, '.env.example'), 'utf8')
    expect(env).toContain('OPENAI_API_KEY=')
  })

  it('writes a multi-agent starter with planner + researcher', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({
      targetDir: tempDir,
      template: 'multi-agent',
      provider: 'anthropic',
    })

    const file = await readFile(path.join(tempDir, 'src/index.ts'), 'utf8')
    expect(file).toContain("import { planner, researcher } from '@agentskit/skills'")
    expect(file).toContain('delegates: {')
    expect(file).toContain('researcher: {')

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@agentskit/skills']).toBeTruthy()
  })

  it('omits adapter package and shows demo adapter inline when provider is demo', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'runtime', provider: 'demo' })

    const file = await readFile(path.join(tempDir, 'src/index.ts'), 'utf8')
    expect(file).toContain('demoAdapter')

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@agentskit/adapters']).toBeUndefined()
  })
})
