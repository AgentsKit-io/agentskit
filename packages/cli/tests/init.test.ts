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

  it('writes a SvelteKit starter', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'sveltekit', provider: 'demo' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@sveltejs/kit']).toBeTruthy()
    expect(pkg.dependencies['@agentskit/svelte']).toBeTruthy()

    const route = await readFile(path.join(tempDir, 'src/routes/api/chat/+server.ts'), 'utf8')
    expect(route).toContain('export const POST')
    expect(route).toContain('demoAdapter')

    const page = await readFile(path.join(tempDir, 'src/routes/+page.svelte'), 'utf8')
    expect(page).toContain('useChat')
  })

  it('writes a Nuxt starter', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'nuxt', provider: 'openai' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies.nuxt).toBeTruthy()
    expect(pkg.dependencies['@agentskit/vue']).toBeTruthy()

    const handler = await readFile(path.join(tempDir, 'server/api/chat.post.ts'), 'utf8')
    expect(handler).toContain("import { openai }")
    expect(handler).toContain('defineEventHandler')

    const env = await readFile(path.join(tempDir, '.env.example'), 'utf8')
    expect(env).toContain('OPENAI_API_KEY=')
  })

  it('writes a Vite+Ink starter with hot reload', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'vite-ink', provider: 'demo' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.scripts.dev).toBe('vite-node --watch src/index.tsx')
    expect(pkg.dependencies['@agentskit/ink']).toBeTruthy()
  })

  it('writes a Cloudflare Workers starter', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'cloudflare-workers', provider: 'anthropic' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies['itty-router']).toBeTruthy()
    expect(pkg.devDependencies.wrangler).toBeTruthy()

    const wrangler = await readFile(path.join(tempDir, 'wrangler.toml'), 'utf8')
    expect(wrangler).toContain('main = "src/worker.ts"')
    expect(wrangler).toContain('compatibility_date')

    const worker = await readFile(path.join(tempDir, 'src/worker.ts'), 'utf8')
    expect(worker).toContain('import { anthropic }')
    expect(worker).toContain("env.ANTHROPIC_API_KEY")
  })

  it('writes a Bun server starter', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'bun', provider: 'demo' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.scripts.dev).toBe('bun --hot src/server.ts')

    const server = await readFile(path.join(tempDir, 'src/server.ts'), 'utf8')
    expect(server).toContain('Bun.serve')
    expect(server).toContain('demoAdapter')
  })

  it('writes a Next.js App Router starter with a streaming Route Handler', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'nextjs', provider: 'demo' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies.next).toBeTruthy()
    expect(pkg.dependencies['@agentskit/react']).toBeTruthy()
    expect(pkg.scripts.dev).toBe('next dev')

    const route = await readFile(path.join(tempDir, 'app/api/chat/route.ts'), 'utf8')
    expect(route).toContain('export async function POST')
    expect(route).toContain("export const runtime = 'edge'")
    expect(route).toContain('demoAdapter')

    const page = await readFile(path.join(tempDir, 'app/page.tsx'), 'utf8')
    expect(page).toContain("'use client'")
    expect(page).toContain('useChat')
  })

  it('wires a real provider into the Next.js Route Handler', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'nextjs', provider: 'openai' })

    const route = await readFile(path.join(tempDir, 'app/api/chat/route.ts'), 'utf8')
    expect(route).toContain("import { openai } from '@agentskit/adapters'")
    expect(route).toContain('openai({')
    expect(route).not.toContain('demoAdapter')
  })

  it('writes an Expo + auth starter', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'expo', provider: 'demo' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies.expo).toBeTruthy()
    expect(pkg.dependencies['expo-router']).toBeTruthy()
    expect(pkg.dependencies['expo-secure-store']).toBeTruthy()

    const auth = await readFile(path.join(tempDir, 'lib/auth.tsx'), 'utf8')
    expect(auth).toContain('SecureStore')

    const screen = await readFile(path.join(tempDir, 'app/index.tsx'), 'utf8')
    expect(screen).toContain('useAuth')
    expect(screen).toContain('demoAdapter')
  })

  it('writes a Deno Deploy starter', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'deno-deploy', provider: 'openai' })

    const denoConfig = JSON.parse(await readFile(path.join(tempDir, 'deno.json'), 'utf8'))
    expect(denoConfig.tasks.deploy).toContain('deployctl')

    const main = await readFile(path.join(tempDir, 'main.ts'), 'utf8')
    expect(main).toContain('Deno.serve')
    expect(main).toContain("Deno.env.get('OPENAI_API_KEY')")
    expect(main).toContain("import { openai } from 'npm:@agentskit/adapters'")
  })

  it('writes an Angular standalone starter', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agentskit-cli-'))
    await writeStarterProject({ targetDir: tempDir, template: 'angular', provider: 'demo' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@angular/core']).toBeTruthy()
    expect(pkg.dependencies['zone.js']).toBeTruthy()

    const main = await readFile(path.join(tempDir, 'src/main.ts'), 'utf8')
    expect(main).toContain('bootstrapApplication')

    const app = await readFile(path.join(tempDir, 'src/app.ts'), 'utf8')
    expect(app).toContain("standalone: true")
    expect(app).toContain('signal(0)')
  })
})
