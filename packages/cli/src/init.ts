import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type StarterKind = 'react' | 'ink' | 'runtime' | 'multi-agent'
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
  ink: inkStarter,
  runtime: runtimeStarter,
  'multi-agent': multiAgentStarter,
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
