import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type StarterKind =
  | 'react'
  | 'nextjs'
  | 'ink'
  | 'runtime'
  | 'multi-agent'
  | 'sveltekit'
  | 'nuxt'
  | 'vite-ink'
  | 'cloudflare-workers'
  | 'bun'
  | 'expo'
  | 'deno-deploy'
  | 'angular'
export type Provider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'demo'
export type ToolKind = 'web_search' | 'filesystem' | 'shell'
export type MemoryKind = 'none' | 'file' | 'sqlite'
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

export interface InitCommandOptions {
  targetDir: string
  template: StarterKind
  provider?: Provider
  tools?: ToolKind[]
  memory?: MemoryKind
  packageManager?: PackageManager
}

interface RenderContext {
  template: StarterKind
  provider: Provider
  tools: ToolKind[]
  memory: MemoryKind
  pm: PackageManager
}

const PROVIDER_IMPORT: Record<Exclude<Provider, 'demo'>, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  gemini: 'gemini',
  ollama: 'ollama',
}

const PROVIDER_DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
  gemini: 'gemini-2.5-flash',
  ollama: 'llama3.1',
  demo: 'demo',
}

const PROVIDER_ENV_KEY: Record<Provider, string | null> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  ollama: null,
  demo: null,
}

function adapterCall(provider: Provider, prefix = 'process.env'): string {
  const model = PROVIDER_DEFAULT_MODEL[provider]
  if (provider === 'demo') return `demoAdapter()`
  if (provider === 'ollama') return `ollama({ model: '${model}' })`
  const envKey = PROVIDER_ENV_KEY[provider]!
  return `${PROVIDER_IMPORT[provider]}({ apiKey: ${prefix}.${envKey} ?? '', model: '${model}' })`
}

function viteAdapterCall(provider: Provider): string {
  if (provider === 'demo') return `demoAdapter()`
  if (provider === 'ollama') return `ollama({ model: '${PROVIDER_DEFAULT_MODEL[provider]}' })`
  const envKey = PROVIDER_ENV_KEY[provider]!
  return `${PROVIDER_IMPORT[provider]}({ apiKey: import.meta.env.VITE_${envKey} ?? '', model: '${PROVIDER_DEFAULT_MODEL[provider]}' })`
}

function adapterImport(provider: Provider): string {
  if (provider === 'demo') return ''
  return `import { ${PROVIDER_IMPORT[provider]} } from '@agentskit/adapters'\n`
}

function toolImports(tools: ToolKind[]): string {
  if (tools.length === 0) return ''
  return `import { ${tools.map(t => t === 'web_search' ? 'webSearch' : t).join(', ')} } from '@agentskit/tools'\n`
}

function toolList(tools: ToolKind[]): string {
  if (tools.length === 0) return '[]'
  const calls = tools.map(t => {
    if (t === 'web_search') return 'webSearch()'
    if (t === 'filesystem') return `...filesystem({ basePath: './workspace' })`
    if (t === 'shell') return `shell({ allowedCommands: ['ls', 'cat'] })`
    return ''
  })
  return `[${calls.join(', ')}]`
}

function memoryImport(memory: MemoryKind): string {
  if (memory === 'file') return `import { fileChatMemory } from '@agentskit/memory'\n`
  if (memory === 'sqlite') return `import { sqliteChatMemory } from '@agentskit/memory'\n`
  return ''
}

function memoryCall(memory: MemoryKind): string {
  if (memory === 'file') return `fileChatMemory('./.agentskit-history.json')`
  if (memory === 'sqlite') return `sqliteChatMemory({ path: './.agentskit-history.db' })`
  return 'undefined'
}

function demoAdapterSnippet(): string {
  return `function demoAdapter() {
  return {
    createSource: () => ({
      stream: async function* () {
        yield { type: 'text' as const, content: 'Hello from your AgentsKit starter. ' }
        yield { type: 'text' as const, content: 'Configure a real adapter to talk to a model.' }
        yield { type: 'done' as const }
      },
      abort: () => {},
    }),
  }
}\n\n`
}

// ============================================================================
// Templates
// ============================================================================

function reactStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/react': '^0.4.0',
    react: '^19.0.0',
    'react-dom': '^19.0.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'
  if (ctx.tools.length > 0) deps['@agentskit/tools'] = '^0.4.0'
  if (ctx.memory !== 'none') deps['@agentskit/memory'] = '^0.4.0'

  const includesDemo = ctx.provider === 'demo'
  const adapter = ctx.provider === 'demo' ? viteAdapterCall(ctx.provider) : viteAdapterCall(ctx.provider)
  const envKey = PROVIDER_ENV_KEY[ctx.provider]
  const envContent = envKey ? `VITE_${envKey}=\n` : '# No API key required for the local provider\n'

  return {
    'package.json': JSON.stringify(
      {
        name: path.basename(ctx.template === 'react' ? 'agentskit-react-app' : 'agentskit-app'),
        private: true,
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: deps,
        devDependencies: {
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
          '@vitejs/plugin-react': '^5.0.0',
          typescript: '^5.5.0',
          vite: '^7.0.0',
        },
      },
      null,
      2,
    ) + '\n',

    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AgentsKit React Starter</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,

    'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({ plugins: [react()] })
`,

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',

    'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,

    'src/App.tsx': `import { ChatContainer, InputBar, Message, useChat } from '@agentskit/react'
${adapterImport(ctx.provider)}${toolImports(ctx.tools)}${memoryImport(ctx.memory)}import '@agentskit/react/theme'

${includesDemo ? demoAdapterSnippet() : ''}export default function App() {
  const chat = useChat({
    adapter: ${adapter},${ctx.tools.length > 0 ? `\n    tools: ${toolList(ctx.tools)},` : ''}${ctx.memory !== 'none' ? `\n    memory: ${memoryCall(ctx.memory)},` : ''}
  })

  return (
    <ChatContainer>
      {chat.messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
`,

    '.env.example': envContent,

    '.gitignore': `node_modules
dist
.env
.env.local
.agentskit-history.*
`,

    'README.md': readmeFor(ctx),
  }
}

function inkStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/ink': '^0.4.0',
    ink: '^7.0.0',
    react: '^19.0.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'
  if (ctx.tools.length > 0) deps['@agentskit/tools'] = '^0.4.0'
  if (ctx.memory !== 'none') deps['@agentskit/memory'] = '^0.4.0'

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-ink-app',
        private: true,
        type: 'module',
        scripts: {
          dev: 'tsx src/index.tsx',
          start: 'tsx src/index.tsx',
        },
        dependencies: deps,
        devDependencies: {
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
          tsx: '^4.20.0',
          typescript: '^5.5.0',
        },
      },
      null,
      2,
    ) + '\n',

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',

    'src/index.tsx': `import React from 'react'
import { render } from 'ink'
import { ChatContainer, InputBar, Message, useChat } from '@agentskit/ink'
${adapterImport(ctx.provider)}${toolImports(ctx.tools)}${memoryImport(ctx.memory)}
${ctx.provider === 'demo' ? demoAdapterSnippet() : ''}function App() {
  const chat = useChat({
    adapter: ${adapterCall(ctx.provider)},${ctx.tools.length > 0 ? `\n    tools: ${toolList(ctx.tools)},` : ''}${ctx.memory !== 'none' ? `\n    memory: ${memoryCall(ctx.memory)},` : ''}
  })

  return (
    <ChatContainer>
      {chat.messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}

render(<App />)
`,

    '.env.example': PROVIDER_ENV_KEY[ctx.provider]
      ? `${PROVIDER_ENV_KEY[ctx.provider]}=\n`
      : '# No API key required for the local provider\n',

    '.gitignore': `node_modules
.env
.env.local
.agentskit-history.*
`,

    'README.md': readmeFor(ctx),
  }
}

function runtimeStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/runtime': '^0.4.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'
  if (ctx.tools.length > 0) deps['@agentskit/tools'] = '^0.4.0'
  if (ctx.memory !== 'none') deps['@agentskit/memory'] = '^0.4.0'

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-runtime-app',
        private: true,
        type: 'module',
        scripts: {
          start: 'tsx src/index.ts',
          dev: 'tsx src/index.ts',
        },
        dependencies: deps,
        devDependencies: {
          tsx: '^4.20.0',
          typescript: '^5.5.0',
        },
      },
      null,
      2,
    ) + '\n',

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',

    'src/index.ts': `import { createRuntime } from '@agentskit/runtime'
${adapterImport(ctx.provider)}${toolImports(ctx.tools)}${memoryImport(ctx.memory)}
${ctx.provider === 'demo' ? demoAdapterSnippet() : ''}const runtime = createRuntime({
  adapter: ${adapterCall(ctx.provider)},${ctx.tools.length > 0 ? `\n  tools: ${toolList(ctx.tools)},` : ''}${ctx.memory !== 'none' ? `\n  memory: ${memoryCall(ctx.memory)},` : ''}
  maxSteps: 10,
})

const task = process.argv.slice(2).join(' ') || 'Say hello and tell me one fact about TypeScript.'
const result = await runtime.run(task)

console.log(result.content)
console.log(\`\\n— \${result.steps} steps · \${result.toolCalls.length} tool calls · \${result.durationMs}ms\`)
`,

    '.env.example': PROVIDER_ENV_KEY[ctx.provider]
      ? `${PROVIDER_ENV_KEY[ctx.provider]}=\n`
      : '# No API key required for the local provider\n',

    '.gitignore': `node_modules
.env
.env.local
.agentskit-history.*
`,

    'README.md': readmeFor(ctx),
  }
}

function multiAgentStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/runtime': '^0.4.0',
    '@agentskit/skills': '^0.4.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'
  if (ctx.tools.length === 0) ctx.tools = ['web_search']
  deps['@agentskit/tools'] = '^0.4.0'

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-multi-agent',
        private: true,
        type: 'module',
        scripts: {
          start: 'tsx src/index.ts',
          dev: 'tsx src/index.ts',
        },
        dependencies: deps,
        devDependencies: {
          tsx: '^4.20.0',
          typescript: '^5.5.0',
        },
      },
      null,
      2,
    ) + '\n',

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',

    'src/index.ts': `import { createRuntime } from '@agentskit/runtime'
import { planner, researcher } from '@agentskit/skills'
${adapterImport(ctx.provider)}${toolImports(ctx.tools)}
${ctx.provider === 'demo' ? demoAdapterSnippet() : ''}const runtime = createRuntime({
  adapter: ${adapterCall(ctx.provider)},
  maxSteps: 10,
  maxDelegationDepth: 2,
})

const task = process.argv.slice(2).join(' ') || 'Research the current state of WebGPU and summarize.'

const result = await runtime.run(task, {
  skill: planner,
  delegates: {
    researcher: {
      skill: researcher,
      tools: ${toolList(ctx.tools)},
      maxSteps: 5,
    },
  },
})

console.log(result.content)
console.log(\`\\n— \${result.steps} steps · \${result.toolCalls.length} tool calls\`)
`,

    '.env.example': PROVIDER_ENV_KEY[ctx.provider]
      ? `${PROVIDER_ENV_KEY[ctx.provider]}=\n`
      : '# No API key required for the local provider\n',

    '.gitignore': `node_modules
.env
.env.local
`,

    'README.md': readmeFor(ctx),
  }
}

// ============================================================================
// Edge / framework-specific templates
// ============================================================================

function buildAdapterServerImport(provider: Provider): string {
  if (provider === 'demo') return ''
  return `import { ${PROVIDER_IMPORT[provider]} } from '@agentskit/adapters'\n`
}

function envExampleFor(provider: Provider): string {
  const envKey = PROVIDER_ENV_KEY[provider]
  return envKey ? `${envKey}=\n` : '# No API key required for the demo provider\n'
}

function sveltekitStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/svelte': '^0.4.0',
    '@sveltejs/kit': '^2.0.0',
    svelte: '^5.0.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'

  const adapterCallStr = adapterCall(ctx.provider)
  const adapterImport = buildAdapterServerImport(ctx.provider)
  const demoSnippet = ctx.provider === 'demo' ? demoAdapterSnippet() : ''

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-sveltekit-app',
        private: true,
        type: 'module',
        scripts: {
          dev: 'vite dev',
          build: 'vite build',
          preview: 'vite preview',
          check: 'svelte-check --tsconfig ./tsconfig.json',
        },
        dependencies: deps,
        devDependencies: {
          '@sveltejs/adapter-auto': '^4.0.0',
          '@sveltejs/vite-plugin-svelte': '^6.0.0',
          'svelte-check': '^4.0.0',
          typescript: '^5.5.0',
          vite: '^7.0.0',
        },
      },
      null,
      2,
    ) + '\n',

    'svelte.config.js': `import adapter from '@sveltejs/adapter-auto'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() },
}
`,

    'vite.config.ts': `import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
export default defineConfig({ plugins: [sveltekit()] })
`,

    'tsconfig.json': JSON.stringify(
      {
        extends: './.svelte-kit/tsconfig.json',
        compilerOptions: {
          allowJs: true, checkJs: true, esModuleInterop: true,
          forceConsistentCasingInFileNames: true, resolveJsonModule: true,
          skipLibCheck: true, sourceMap: true, strict: true, moduleResolution: 'bundler',
        },
      },
      null,
      2,
    ) + '\n',

    'src/app.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body>%sveltekit.body%</body>
</html>
`,

    'src/routes/+page.svelte': `<script lang="ts">
  import { useChat } from '@agentskit/svelte'
  import '@agentskit/svelte/theme'

  const chat = useChat({ endpoint: '/api/chat' })
</script>

<main>
  {#each $chat.messages as message (message.id)}
    <article data-ak-message data-role={message.role}>{message.content}</article>
  {/each}
  <form on:submit|preventDefault={() => chat.send($chat.input)}>
    <input bind:value={$chat.input} />
    <button>Send</button>
  </form>
</main>
`,

    'src/routes/api/chat/+server.ts': `import type { RequestHandler } from './$types'
${adapterImport}${demoSnippet}export const POST: RequestHandler = async ({ request }) => {
  const { messages } = await request.json()
  const adapter = ${adapterCallStr}
  const source = adapter.createSource({ messages: messages.map((m: { role: string; content: string }, i: number) => ({
    id: String(i), role: m.role, content: m.content,
    status: 'complete' as const, createdAt: new Date(0),
  })) })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const chunk of source.stream()) {
        if (chunk.type === 'text') controller.enqueue(encoder.encode(chunk.content))
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
`,

    '.env.example': envExampleFor(ctx.provider),
    '.gitignore': 'node_modules\n.svelte-kit\nbuild\n.env\n.env.local\n',
    'README.md': readmeFor(ctx),
  }
}

function nuxtStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/vue': '^0.4.0',
    nuxt: '^4.0.0',
    vue: '^3.5.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'

  const adapterCallStr = adapterCall(ctx.provider)
  const adapterImport = buildAdapterServerImport(ctx.provider)
  const demoSnippet = ctx.provider === 'demo' ? demoAdapterSnippet() : ''

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-nuxt-app',
        private: true,
        type: 'module',
        scripts: {
          dev: 'nuxt dev',
          build: 'nuxt build',
          preview: 'nuxt preview',
          generate: 'nuxt generate',
        },
        dependencies: deps,
        devDependencies: { typescript: '^5.5.0' },
      },
      null,
      2,
    ) + '\n',

    'nuxt.config.ts': `export default defineNuxtConfig({
  compatibilityDate: '2026-04-01',
  modules: [],
  typescript: { strict: true },
})
`,

    'tsconfig.json': JSON.stringify(
      { extends: './.nuxt/tsconfig.json' },
      null,
      2,
    ) + '\n',

    'app.vue': `<script setup lang="ts">
import { useChat } from '@agentskit/vue'
import '@agentskit/vue/theme'

const { messages, input, send } = useChat({ endpoint: '/api/chat' })
</script>

<template>
  <main>
    <article v-for="message in messages" :key="message.id" :data-role="message.role">
      {{ message.content }}
    </article>
    <form @submit.prevent="send(input)">
      <input v-model="input" />
      <button>Send</button>
    </form>
  </main>
</template>
`,

    'server/api/chat.post.ts': `${adapterImport}${demoSnippet}export default defineEventHandler(async (event) => {
  const { messages } = await readBody<{ messages: Array<{ role: string; content: string }> }>(event)
  const adapter = ${adapterCallStr}
  const source = adapter.createSource({ messages: messages.map((m, i) => ({
    id: String(i), role: m.role as 'user' | 'assistant' | 'system',
    content: m.content, status: 'complete' as const, createdAt: new Date(0),
  })) })

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return sendStream(event, new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const chunk of source.stream()) {
        if (chunk.type === 'text') controller.enqueue(encoder.encode(chunk.content))
      }
      controller.close()
    },
  }))
})
`,

    '.env.example': envExampleFor(ctx.provider),
    '.gitignore': 'node_modules\n.nuxt\n.output\n.env\n.env.local\n',
    'README.md': readmeFor(ctx),
  }
}

function viteInkStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/ink': '^0.4.0',
    ink: '^7.0.0',
    react: '^19.0.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'
  if (ctx.tools.length > 0) deps['@agentskit/tools'] = '^0.4.0'

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-vite-ink-app',
        private: true,
        type: 'module',
        scripts: {
          dev: 'vite-node --watch src/index.tsx',
          start: 'vite-node src/index.tsx',
          build: 'vite build',
        },
        dependencies: deps,
        devDependencies: {
          '@types/react': '^19.0.0',
          'vite-node': '^4.0.0',
          vite: '^7.0.0',
          typescript: '^5.5.0',
        },
      },
      null,
      2,
    ) + '\n',

    'vite.config.ts': `import { defineConfig } from 'vite'
export default defineConfig({
  build: { ssr: true, target: 'node22', rollupOptions: { input: 'src/index.tsx' } },
})
`,

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
          jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',

    'src/index.tsx': `import React from 'react'
import { render } from 'ink'
import { ChatContainer, InputBar, Message, useChat } from '@agentskit/ink'
${adapterImport(ctx.provider)}${toolImports(ctx.tools)}
${ctx.provider === 'demo' ? demoAdapterSnippet() : ''}function App() {
  const chat = useChat({
    adapter: ${adapterCall(ctx.provider)},${ctx.tools.length > 0 ? `\n    tools: ${toolList(ctx.tools)},` : ''}
  })

  return (
    <ChatContainer>
      {chat.messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}

render(<App />)
`,

    '.env.example': envExampleFor(ctx.provider),
    '.gitignore': 'node_modules\ndist\n.env\n.env.local\n.agentskit-history.*\n',
    'README.md': readmeFor(ctx),
  }
}

function cloudflareWorkersStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    'itty-router': '^5.0.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'

  const adapterCallEdge = ctx.provider === 'demo'
    ? 'demoAdapter()'
    : ctx.provider === 'ollama'
      ? `ollama({ model: '${PROVIDER_DEFAULT_MODEL[ctx.provider]}' })`
      : `${PROVIDER_IMPORT[ctx.provider]}({ apiKey: env.${PROVIDER_ENV_KEY[ctx.provider]!} ?? '', model: '${PROVIDER_DEFAULT_MODEL[ctx.provider]}' })`
  const adapterImport = buildAdapterServerImport(ctx.provider)
  const demoSnippet = ctx.provider === 'demo' ? demoAdapterSnippet() : ''
  const envKey = PROVIDER_ENV_KEY[ctx.provider]

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-cf-worker',
        private: true,
        type: 'module',
        scripts: {
          dev: 'wrangler dev',
          deploy: 'wrangler deploy',
        },
        dependencies: deps,
        devDependencies: {
          '@cloudflare/workers-types': '^4.0.0',
          typescript: '^5.5.0',
          wrangler: '^3.0.0',
        },
      },
      null,
      2,
    ) + '\n',

    'wrangler.toml': `name = "agentskit-cf-worker"
main = "src/worker.ts"
compatibility_date = "2026-04-01"
compatibility_flags = ["nodejs_compat"]

# Bind D1 + KV when you wire memory:
# [[d1_databases]]
# binding = "DB"
# database_name = "agentskit"
#
# [[kv_namespaces]]
# binding = "KV"
# id = "..."

[vars]
${envKey ? `# Set ${envKey} via 'wrangler secret put ${envKey}'` : '# No API key required for the demo provider'}
`,

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
          lib: ['ES2022'], types: ['@cloudflare/workers-types'],
          strict: true, noEmit: true, skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',

    'src/worker.ts': `import { Router } from 'itty-router'
${adapterImport}
${demoSnippet}interface Env {
  ${envKey ? `${envKey}: string` : '/* no env vars */'}
}

const router = Router()

router.post('/chat', async (request: Request, env: Env) => {
  const { messages } = await request.json() as { messages: Array<{ role: string; content: string }> }
  const adapter = ${adapterCallEdge}
  const source = adapter.createSource({ messages: messages.map((m, i) => ({
    id: String(i), role: m.role as 'user' | 'assistant' | 'system',
    content: m.content, status: 'complete' as const, createdAt: new Date(0),
  })) })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const chunk of source.stream()) {
        if (chunk.type === 'text') controller.enqueue(encoder.encode(chunk.content))
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
})

router.all('*', () => new Response('not found', { status: 404 }))

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => router.handle(req, env, ctx),
} satisfies ExportedHandler<Env>
`,

    '.env.example': envExampleFor(ctx.provider),
    '.gitignore': 'node_modules\n.wrangler\n.dev.vars\n.env\n.env.local\n',
    'README.md': readmeFor(ctx),
  }
}

function bunStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {}
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'
  const adapterCallStr = adapterCall(ctx.provider)
  const adapterImport = buildAdapterServerImport(ctx.provider)
  const demoSnippet = ctx.provider === 'demo' ? demoAdapterSnippet() : ''

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-bun-server',
        private: true,
        type: 'module',
        scripts: {
          dev: 'bun --hot src/server.ts',
          start: 'bun src/server.ts',
        },
        dependencies: deps,
        devDependencies: { typescript: '^5.5.0' },
      },
      null,
      2,
    ) + '\n',

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
          types: ['bun-types'], strict: true, noEmit: true, skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',

    'src/server.ts': `${adapterImport}${demoSnippet}const adapter = ${adapterCallStr}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(request) {
    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname === '/chat') {
      const { messages } = await request.json() as { messages: Array<{ role: string; content: string }> }
      const source = adapter.createSource({ messages: messages.map((m, i) => ({
        id: String(i), role: m.role as 'user' | 'assistant' | 'system',
        content: m.content, status: 'complete' as const, createdAt: new Date(0),
      })) })
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder()
          for await (const chunk of source.stream()) {
            if (chunk.type === 'text') controller.enqueue(encoder.encode(chunk.content))
          }
          controller.close()
        },
      })
      return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }
    if (url.pathname === '/') {
      return new Response(\`<!doctype html><title>AgentsKit Bun starter</title>
<body><pre>POST /chat with { messages: [...] }</pre></body>\`, {
        headers: { 'content-type': 'text/html' },
      })
    }
    return new Response('not found', { status: 404 })
  },
})

console.log(\`Listening on http://localhost:\${server.port}\`)
`,

    '.env.example': envExampleFor(ctx.provider),
    '.gitignore': 'node_modules\n.env\n.env.local\nbun.lockb\n',
    'README.md': readmeFor(ctx),
  }
}

function nextjsStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/react': '^0.4.0',
    next: '^15.0.0',
    react: '^19.0.0',
    'react-dom': '^19.0.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'
  if (ctx.tools.length > 0) deps['@agentskit/tools'] = '^0.4.0'

  const envKey = PROVIDER_ENV_KEY[ctx.provider]
  const adapter = adapterCall(ctx.provider)
  const apiAdapterImport = ctx.provider === 'demo'
    ? ''
    : `import { ${PROVIDER_IMPORT[ctx.provider as Exclude<Provider, 'demo'>]} } from '@agentskit/adapters'\n`
  const apiDemoSnippet = ctx.provider === 'demo' ? demoAdapterSnippet() : ''

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-nextjs-app',
        private: true,
        type: 'module',
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: deps,
        devDependencies: {
          '@types/node': '^22.0.0',
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
          typescript: '^5.5.0',
        },
      },
      null,
      2,
    ) + '\n',

    'next.config.mjs': `/** @type {import('next').NextConfig} */
const nextConfig = {}
export default nextConfig
`,

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['dom', 'dom.iterable', 'ES2022'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      },
      null,
      2,
    ) + '\n',

    'app/layout.tsx': `import type { ReactNode } from 'react'
import '@agentskit/react/theme'

export const metadata = { title: 'AgentsKit · Next.js Starter' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`,

    'app/page.tsx': `'use client'

import { ChatContainer, InputBar, Message, useChat } from '@agentskit/react'
import { genericAdapter } from './chat-adapter'

export default function Page() {
  const chat = useChat({ adapter: genericAdapter('/api/chat') })

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
      <ChatContainer>
        {chat.messages.map(message => (
          <Message key={message.id} message={message} />
        ))}
        <InputBar chat={chat} />
      </ChatContainer>
    </main>
  )
}
`,

    'app/chat-adapter.ts': `import { generic } from '@agentskit/adapters'

export const genericAdapter = (route: string) => generic({
  fetch: async ({ messages, signal }) => {
    const response = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    })
    if (!response.body) throw new Error('No body returned from /api/chat')
    return response
  },
})
`,

    'app/api/chat/route.ts': `${apiAdapterImport}${apiDemoSnippet}export const runtime = 'edge'

export async function POST(request: Request) {
  const { messages } = await request.json() as { messages: Array<{ role: string; content: string }> }

  const adapter = ${adapter}

  const source = adapter.createSource({ messages: messages.map((message, index) => ({
    id: String(index),
    role: message.role as 'user' | 'assistant' | 'system',
    content: message.content,
    status: 'complete' as const,
    createdAt: new Date(0),
  })) })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of source.stream()) {
          if (chunk.type === 'text') controller.enqueue(encoder.encode(chunk.content))
        }
      } catch (err) {
        controller.error(err)
        return
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
`,

    '.env.example': envKey ? `${envKey}=\n` : '# No API key required for the demo provider\n',

    '.gitignore': `node_modules
.next
out
.env
.env.local
.agentskit-history.*
`,

    'README.md': readmeFor(ctx),
  }
}

function expoStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    expo: '^54.0.0',
    'expo-router': '^7.0.0',
    'expo-secure-store': '^15.0.0',
    react: '^19.0.0',
    'react-native': '^0.84.0',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'
  const adapterCallStr = adapterCall(ctx.provider)
  const adapterImport = ctx.provider === 'demo' ? '' : `import { ${PROVIDER_IMPORT[ctx.provider]} } from '@agentskit/adapters'\n`
  const demoSnippet = ctx.provider === 'demo' ? demoAdapterSnippet() : ''

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-expo-app',
        version: '1.0.0',
        main: 'expo-router/entry',
        scripts: {
          start: 'expo start',
          android: 'expo start --android',
          ios: 'expo start --ios',
          web: 'expo start --web',
        },
        dependencies: deps,
        devDependencies: {
          '@types/react': '^19.0.0',
          typescript: '^5.5.0',
        },
      },
      null,
      2,
    ) + '\n',

    'app.json': JSON.stringify(
      {
        expo: {
          name: 'AgentsKit Expo Starter',
          slug: 'agentskit-expo',
          scheme: 'agentskit',
          plugins: ['expo-router', 'expo-secure-store'],
          ios: { bundleIdentifier: 'com.example.agentskit' },
          android: { package: 'com.example.agentskit' },
        },
      },
      null,
      2,
    ) + '\n',

    'tsconfig.json': JSON.stringify(
      { extends: 'expo/tsconfig.base', compilerOptions: { strict: true } },
      null,
      2,
    ) + '\n',

    'app/_layout.tsx': `import { Stack } from 'expo-router'
import { AuthProvider } from '../lib/auth'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack />
    </AuthProvider>
  )
}
`,

    'app/index.tsx': `import { useState } from 'react'
import { Text, TextInput, View, Pressable, ScrollView } from 'react-native'
import { useAuth } from '../lib/auth'
${adapterImport}${demoSnippet}export default function Chat() {
  const { token, signIn, signOut } = useAuth()
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')

  if (!token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 20, marginBottom: 12 }}>Sign in to chat</Text>
        <Pressable onPress={() => signIn('demo-token')}><Text>Sign in</Text></Pressable>
      </View>
    )
  }

  async function send() {
    if (!input.trim()) return
    const next = [...messages, { role: 'user' as const, content: input }]
    setMessages(next)
    setInput('')
    const adapter = ${adapterCallStr}
    const source = adapter.createSource({ messages: next.map((m, i) => ({
      id: String(i), role: m.role, content: m.content,
      status: 'complete' as const, createdAt: new Date(0),
    })) })
    let acc = ''
    for await (const chunk of source.stream()) {
      if (chunk.type === 'text') {
        acc += chunk.content
        setMessages([...next, { role: 'assistant', content: acc }])
      }
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Pressable onPress={signOut}><Text>Sign out</Text></Pressable>
      <ScrollView style={{ flex: 1 }}>
        {messages.map((m, i) => (
          <Text key={i} style={{ marginVertical: 4 }}>{m.role}: {m.content}</Text>
        ))}
      </ScrollView>
      <TextInput value={input} onChangeText={setInput} onSubmitEditing={send} placeholder="Ask anything…" />
    </View>
  )
}
`,

    'lib/auth.tsx': `import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'

interface AuthValue { token: string | null; signIn: (t: string) => void; signOut: () => void }
const AuthCtx = createContext<AuthValue>({ token: null, signIn: () => {}, signOut: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    SecureStore.getItemAsync('agentskit_token').then(setToken).catch(() => {})
  }, [])

  return (
    <AuthCtx.Provider
      value={{
        token,
        signIn: (t) => { SecureStore.setItemAsync('agentskit_token', t); setToken(t) },
        signOut: () => { SecureStore.deleteItemAsync('agentskit_token'); setToken(null) },
      }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
`,

    '.env.example': envExampleFor(ctx.provider),
    '.gitignore': 'node_modules\n.expo\ndist\n.env\n.env.local\n',
    'README.md': readmeFor(ctx),
  }
}

function denoDeployStarter(ctx: RenderContext): Record<string, string> {
  const adapterCallEdge = ctx.provider === 'demo'
    ? 'demoAdapter()'
    : ctx.provider === 'ollama'
      ? `ollama({ model: '${PROVIDER_DEFAULT_MODEL[ctx.provider]}' })`
      : `${PROVIDER_IMPORT[ctx.provider]}({ apiKey: Deno.env.get('${PROVIDER_ENV_KEY[ctx.provider]!}') ?? '', model: '${PROVIDER_DEFAULT_MODEL[ctx.provider]}' })`
  const adapterImport = ctx.provider === 'demo'
    ? ''
    : `import { ${PROVIDER_IMPORT[ctx.provider]} } from 'npm:@agentskit/adapters'\n`
  const demoSnippet = ctx.provider === 'demo' ? demoAdapterSnippet() : ''

  return {
    'deno.json': JSON.stringify(
      {
        tasks: {
          dev: 'deno run --allow-net --allow-env --watch main.ts',
          start: 'deno run --allow-net --allow-env main.ts',
          deploy: 'deployctl deploy --project=agentskit-deno main.ts',
        },
        imports: {
          '@agentskit/adapters': 'npm:@agentskit/adapters@^0.4.0',
        },
      },
      null,
      2,
    ) + '\n',

    'main.ts': `${adapterImport}${demoSnippet}const adapter = ${adapterCallEdge}

Deno.serve(async (request) => {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname === '/chat') {
    const { messages } = await request.json() as { messages: Array<{ role: string; content: string }> }
    const source = adapter.createSource({ messages: messages.map((m, i) => ({
      id: String(i), role: m.role as 'user' | 'assistant' | 'system',
      content: m.content, status: 'complete' as const, createdAt: new Date(0),
    })) })
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        for await (const chunk of source.stream()) {
          if (chunk.type === 'text') controller.enqueue(encoder.encode(chunk.content))
        }
        controller.close()
      },
    })
    return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }
  return new Response(\`<!doctype html><title>AgentsKit Deno Deploy starter</title>
<body><pre>POST /chat with { messages: [...] }</pre></body>\`, {
    headers: { 'content-type': 'text/html' },
  })
})
`,

    '.env.example': envExampleFor(ctx.provider),
    '.gitignore': '.env\n.env.local\n',
    'README.md': readmeFor(ctx),
  }
}

function angularStarter(ctx: RenderContext): Record<string, string> {
  const deps: Record<string, string> = {
    '@agentskit/angular': '^0.4.0',
    '@angular/core': '^21.0.0',
    '@angular/common': '^21.0.0',
    '@angular/compiler': '^21.0.0',
    '@angular/platform-browser': '^21.0.0',
    '@angular/platform-browser-dynamic': '^21.0.0',
    rxjs: '^7.8.0',
    'zone.js': '^0.16.1',
  }
  if (ctx.provider !== 'demo') deps['@agentskit/adapters'] = '^0.4.0'

  return {
    'package.json': JSON.stringify(
      {
        name: 'agentskit-angular-app',
        private: true,
        scripts: {
          dev: 'ng serve',
          build: 'ng build',
          start: 'ng serve',
        },
        dependencies: deps,
        devDependencies: {
          '@angular/cli': '^21.0.0',
          '@angular/compiler-cli': '^21.0.0',
          typescript: '^5.5.0',
        },
      },
      null,
      2,
    ) + '\n',

    'angular.json': JSON.stringify(
      {
        $schema: './node_modules/@angular/cli/lib/config/schema.json',
        version: 1,
        projects: {
          app: {
            projectType: 'application',
            root: '',
            sourceRoot: 'src',
            prefix: 'ak',
            architect: {
              build: {
                builder: '@angular/build:application',
                options: { browser: 'src/main.ts', tsConfig: 'tsconfig.json', index: 'src/index.html' },
              },
              serve: { builder: '@angular/build:dev-server', options: { buildTarget: 'app:build' } },
            },
          },
        },
      },
      null,
      2,
    ) + '\n',

    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022', module: 'preserve', moduleResolution: 'bundler',
          strict: true, experimentalDecorators: true, useDefineForClassFields: false,
          lib: ['ES2022', 'DOM'],
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ) + '\n',

    'src/index.html': `<!doctype html>
<html><head><title>AgentsKit Angular</title></head>
<body><ak-root></ak-root></body></html>
`,

    'src/main.ts': `import { bootstrapApplication } from '@angular/platform-browser'
import 'zone.js'
import { AppComponent } from './app'

bootstrapApplication(AppComponent)
`,

    'src/app.ts': `import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'ak-root',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <main style="max-width: 640px; margin: 2rem auto;">
      <h1>AgentsKit · Angular standalone</h1>
      <p>Wire @agentskit/angular here. See the docs for the chat service binding.</p>
      <p>Counter (sanity): {{ count() }}</p>
      <button (click)="bump()">+1</button>
    </main>
  \`,
})
export class AppComponent {
  readonly count = signal(0)
  bump() { this.count.update(n => n + 1) }
}
`,

    '.env.example': envExampleFor(ctx.provider),
    '.gitignore': 'node_modules\ndist\n.angular\n.env\n.env.local\n',
    'README.md': readmeFor(ctx),
  }
}

function readmeFor(ctx: RenderContext): string {
  const installCmd = ctx.pm === 'npm' ? 'npm install' : `${ctx.pm} install`
  const runCmd = ctx.pm === 'npm' ? 'npm run dev' : `${ctx.pm} dev`
  const envKey = PROVIDER_ENV_KEY[ctx.provider]

  return `# AgentsKit ${ctx.template} starter

Generated by \`agentskit init\`.

## Stack

- **Template**: \`${ctx.template}\`
- **Provider**: \`${ctx.provider}\`${ctx.tools.length ? `\n- **Tools**: ${ctx.tools.map(t => `\`${t}\``).join(', ')}` : ''}${ctx.memory !== 'none' ? `\n- **Memory**: \`${ctx.memory}\`` : ''}

## Run

\`\`\`bash
${installCmd}
${envKey ? `cp .env.example .env\n# add ${envKey}=...` : '# No API key required'}
${runCmd}
\`\`\`

## Next steps

- Open the AgentsKit docs at https://www.agentskit.io/docs
- Add a custom skill: https://www.agentskit.io/docs/concepts/skill
- Wire up RAG: https://www.agentskit.io/docs/recipes/rag-chat

## License

ISC
`
}

// ============================================================================
// Main
// ============================================================================

const TEMPLATE_FN: Record<StarterKind, (ctx: RenderContext) => Record<string, string>> = {
  react: reactStarter,
  nextjs: nextjsStarter,
  ink: inkStarter,
  runtime: runtimeStarter,
  'multi-agent': multiAgentStarter,
  sveltekit: sveltekitStarter,
  nuxt: nuxtStarter,
  'vite-ink': viteInkStarter,
  'cloudflare-workers': cloudflareWorkersStarter,
  bun: bunStarter,
  expo: expoStarter,
  'deno-deploy': denoDeployStarter,
  angular: angularStarter,
}

export async function writeStarterProject(options: InitCommandOptions): Promise<void> {
  const ctx: RenderContext = {
    template: options.template,
    provider: options.provider ?? 'demo',
    tools: options.tools ?? [],
    memory: options.memory ?? 'none',
    pm: options.packageManager ?? 'pnpm',
  }

  const files = TEMPLATE_FN[ctx.template](ctx)
  await mkdir(options.targetDir, { recursive: true })

  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const absolutePath = path.join(options.targetDir, relativePath)
      await mkdir(path.dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, content, 'utf8')
    }),
  )
}
