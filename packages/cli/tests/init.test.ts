import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { renderChatHeader } from '../src/chat'
import { writeStarterProject } from '../src/init'
import { resolveChatProvider } from '../src/providers'
import { withTempDir } from '@agentskit/cross-platform/testing'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

function itWithTempDir(name: string, run: (directory: string) => Promise<void>): void {
  it(name, () => withTempDir(run, 'agentskit-cli-'))
}

describe('@agentskit/cli', () => {
  it('renders a short chat header', () => {
    expect(renderChatHeader({ provider: 'demo', model: 'test' })).toContain('provider=demo')
  })

  itWithTempDir('writes a react starter project', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'react' })

    const packageJson = await readFile(path.join(tempDir, 'package.json'), 'utf8')
    const appFile = await readFile(path.join(tempDir, 'src/App.tsx'), 'utf8')
    const mainFile = await readFile(path.join(tempDir, 'src/main.tsx'), 'utf8')

    expect(packageJson).toContain('@agentskit/react')
    expect(appFile).toContain('useChat')
    expect(mainFile).toContain('createRoot')
  })

  itWithTempDir('refuses non-empty targets by default and atomically replaces generated files with force', async (tempDir) => {
    await writeFile(path.join(tempDir, 'keep.txt'), 'keep me', 'utf8')

    await expect(writeStarterProject({ targetDir: tempDir, template: 'react' })).rejects.toThrow(
      /not empty/,
    )

    await writeStarterProject({ targetDir: tempDir, template: 'react', force: true })
    expect(await readFile(path.join(tempDir, 'keep.txt'), 'utf8')).toBe('keep me')
    expect(await readFile(path.join(tempDir, 'package.json'), 'utf8')).toContain(
      '"@agentskit/react": "^0.8.3"',
    )
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

  itWithTempDir('writes an ink starter with a demo adapter', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'ink', provider: 'demo' })

    const file = await readFile(path.join(tempDir, 'src/index.tsx'), 'utf8')
    expect(file).toContain("from '@agentskit/ink'")
    expect(file).toContain('demoAdapter')
    expect(file).not.toContain('@agentskit/adapters')
  })

  itWithTempDir('writes a runtime starter wired to OpenAI', async (tempDir) => {
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

  itWithTempDir('writes a runtime starter wired to Groq', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'runtime', provider: 'groq' })

    const file = await readFile(path.join(tempDir, 'src/index.ts'), 'utf8')
    expect(file).toContain("import { groq } from '@agentskit/adapters'")
    expect(file).toContain("model: 'openai/gpt-oss-120b'")

    const env = await readFile(path.join(tempDir, '.env.example'), 'utf8')
    expect(env).toContain('GROQ_API_KEY=')
  })

  itWithTempDir('writes a browser starter wired to OpenRouter', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'react', provider: 'openrouter' })

    const app = await readFile(path.join(tempDir, 'src/App.tsx'), 'utf8')
    expect(app).toContain("import { openrouter } from '@agentskit/adapters'")
    expect(app).toContain("model: '~anthropic/claude-haiku-latest'")

    const env = await readFile(path.join(tempDir, '.env.example'), 'utf8')
    expect(env).toContain('VITE_OPENROUTER_API_KEY=')
  })

  it.each([
    ['deepseek', 'deepseek', 'deepseek-chat', 'DEEPSEEK_API_KEY'],
    ['grok', 'grok', 'grok-4.20-0309-non-reasoning', 'XAI_API_KEY'],
    ['kimi', 'kimi', 'kimi-k2-0711-preview', 'KIMI_API_KEY'],
  ] as const)('writes a runtime starter wired to %s', async (provider, importName, model, envKey) =>
    withTempDir(async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'runtime', provider })

    const file = await readFile(path.join(tempDir, 'src/index.ts'), 'utf8')
    expect(file).toContain(`import { ${importName} } from '@agentskit/adapters'`)
    expect(file).toContain(`model: '${model}'`)

    const env = await readFile(path.join(tempDir, '.env.example'), 'utf8')
    expect(env).toContain(`${envKey}=`)
    }, 'agentskit-cli-'),
  )

  itWithTempDir('writes a multi-agent starter with planner + researcher', async (tempDir) => {
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

  itWithTempDir('omits adapter package and shows demo adapter inline when provider is demo', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'runtime', provider: 'demo' })

    const file = await readFile(path.join(tempDir, 'src/index.ts'), 'utf8')
    expect(file).toContain('demoAdapter')

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@agentskit/adapters']).toBeUndefined()
  })

  itWithTempDir('writes a SvelteKit starter', async (tempDir) => {
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

  itWithTempDir('writes a Nuxt starter', async (tempDir) => {
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

  itWithTempDir('writes a Vite+Ink starter with hot reload', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'vite-ink', provider: 'demo' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.scripts.dev).toBe('vite-node --watch src/index.tsx')
    expect(pkg.dependencies['@agentskit/ink']).toBeTruthy()
  })

  itWithTempDir('writes a Cloudflare Workers starter', async (tempDir) => {
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

  itWithTempDir('writes a Bun server starter', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'bun', provider: 'demo' })

    const pkg = JSON.parse(await readFile(path.join(tempDir, 'package.json'), 'utf8'))
    expect(pkg.scripts.dev).toBe('bun --hot src/server.ts')

    const server = await readFile(path.join(tempDir, 'src/server.ts'), 'utf8')
    expect(server).toContain('Bun.serve')
    expect(server).toContain('demoAdapter')
  })

  itWithTempDir('writes a Next.js App Router starter with a streaming Route Handler', async (tempDir) => {
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

  itWithTempDir('wires a real provider into the Next.js Route Handler', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'nextjs', provider: 'openai' })

    const route = await readFile(path.join(tempDir, 'app/api/chat/route.ts'), 'utf8')
    expect(route).toContain("import { openai } from '@agentskit/adapters'")
    expect(route).toContain('openai({')
    expect(route).not.toContain('demoAdapter')
  })

  itWithTempDir('writes an Expo + auth starter', async (tempDir) => {
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

  itWithTempDir('writes a Deno Deploy starter', async (tempDir) => {
    await writeStarterProject({ targetDir: tempDir, template: 'deno-deploy', provider: 'openai' })

    const denoConfig = JSON.parse(await readFile(path.join(tempDir, 'deno.json'), 'utf8'))
    expect(denoConfig.tasks.deploy).toContain('deployctl')
    expect(denoConfig.imports['@agentskit/adapters']).toBe('npm:@agentskit/adapters@^0.15.2')

    const main = await readFile(path.join(tempDir, 'main.ts'), 'utf8')
    expect(main).toContain('Deno.serve')
    expect(main).toContain("Deno.env.get('OPENAI_API_KEY')")
    expect(main).toContain("import { openai } from 'npm:@agentskit/adapters'")
  })

  itWithTempDir('writes an Angular standalone starter', async (tempDir) => {
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
