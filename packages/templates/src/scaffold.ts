import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export type ScaffoldType = 'tool' | 'skill' | 'adapter'

export interface ScaffoldConfig {
  type: ScaffoldType
  name: string
  dir: string
  description?: string
}

function packageName(name: string): string {
  return name.startsWith('@') ? name : `agentskit-${name}`
}

function generatePackageJson(config: ScaffoldConfig): string {
  return JSON.stringify({
    name: packageName(config.name),
    version: '0.1.0',
    description: config.description ?? `AgentsKit ${config.type}: ${config.name}`,
    type: 'module',
    main: './dist/index.cjs',
    module: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      },
    },
    files: ['dist'],
    publishConfig: { access: 'public' },
    scripts: {
      build: 'tsup',
      test: 'vitest run',
      lint: 'tsc --noEmit',
    },
    dependencies: {
      '@agentskit/core': '*',
    },
    devDependencies: {
      tsup: '^8.5.0',
      typescript: '^6.0.2',
      vitest: '^4.1.2',
    },
  }, null, 2)
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
      outDir: 'dist',
      types: ['node'],
    },
    include: ['src'],
  }, null, 2)
}

function generateTsupConfig(): string {
  return `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  treeshake: true,
})
`
}

function generateToolSource(name: string): string {
  return `import type { ToolDefinition } from '@agentskit/core'

export function ${camelCase(name)}(): ToolDefinition {
  return {
    name: '${name}',
    description: 'TODO: describe what this tool does',
    tags: [],
    category: 'custom',
    schema: {
      type: 'object',
      properties: {
        // TODO: define input parameters
      },
      required: [],
    },
    execute: async (args) => {
      // TODO: implement tool logic
      return 'not implemented'
    },
  }
}
`
}

function generateSkillSource(name: string): string {
  return `import type { SkillDefinition } from '@agentskit/core'

export const ${camelCase(name)}: SkillDefinition = {
  name: '${name}',
  description: 'TODO: describe what this skill does',
  systemPrompt: \`You are a ${name} assistant.

TODO: Add detailed behavioral instructions here.
\`,
  tools: [],
  delegates: [],
  examples: [
    {
      input: 'TODO: example input',
      output: 'TODO: example output',
    },
  ],
}
`
}

function generateAdapterSource(name: string): string {
  return `import type { AdapterFactory, StreamChunk } from '@agentskit/core'

export interface ${pascalCase(name)}Config {
  apiKey: string
  model?: string
  baseUrl?: string
}

export function ${camelCase(name)}(config: ${pascalCase(name)}Config): AdapterFactory {
  return {
    createSource: (request) => {
      let abortController: AbortController | null = new AbortController()

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          try {
            // TODO: implement API call
            // const response = await fetch(config.baseUrl + '/v1/chat', {
            //   method: 'POST',
            //   headers: { Authorization: \`Bearer \${config.apiKey}\` },
            //   body: JSON.stringify({ model: config.model, messages: request.messages }),
            //   signal: abortController?.signal,
            // })

            yield { type: 'text', content: 'TODO: implement streaming' }
            yield { type: 'done' }
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return
            yield { type: 'error', content: err instanceof Error ? err.message : String(err) }
          }
        },
        abort: () => {
          abortController?.abort()
          abortController = null
        },
      }
    },
  }
}
`
}

function generateTest(type: ScaffoldType, name: string): string {
  if (type === 'tool') {
    return `import { describe, it, expect } from 'vitest'
import { ${camelCase(name)} } from '../src/index'

describe('${name}', () => {
  it('satisfies ToolDefinition contract', () => {
    const tool = ${camelCase(name)}()
    expect(tool.name).toBe('${name}')
    expect(tool.description).toBeTruthy()
    expect(tool.schema).toBeDefined()
    expect(tool.execute).toBeTypeOf('function')
  })
})
`
  }
  if (type === 'skill') {
    return `import { describe, it, expect } from 'vitest'
import { ${camelCase(name)} } from '../src/index'

describe('${name}', () => {
  it('satisfies SkillDefinition contract', () => {
    expect(${camelCase(name)}.name).toBe('${name}')
    expect(${camelCase(name)}.description).toBeTruthy()
    expect(${camelCase(name)}.systemPrompt.length).toBeGreaterThan(10)
  })
})
`
  }
  return `import { describe, it, expect } from 'vitest'
import { ${camelCase(name)} } from '../src/index'

describe('${name}', () => {
  it('satisfies AdapterFactory contract', () => {
    const adapter = ${camelCase(name)}({ apiKey: 'test' })
    expect(adapter.createSource).toBeTypeOf('function')
  })
})
`
}

function generateIndexSource(type: ScaffoldType, name: string): string {
  const sources: Record<ScaffoldType, () => string> = {
    tool: () => generateToolSource(name),
    skill: () => generateSkillSource(name),
    adapter: () => generateAdapterSource(name),
  }
  return sources[type]()
}

function generateReadme(config: ScaffoldConfig): string {
  return `# ${packageName(config.name)}

${config.description ?? `AgentsKit ${config.type}: ${config.name}`}

## Install

\`\`\`bash
npm install ${packageName(config.name)}
\`\`\`

## Usage

\`\`\`ts
import { ${camelCase(config.name)} } from '${packageName(config.name)}'

// TODO: add usage example
\`\`\`

## Development

\`\`\`bash
npm run build   # build
npm test        # run tests
npm run lint    # type check
\`\`\`
`
}

function camelCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase())
}

function pascalCase(str: string): string {
  const cc = camelCase(str)
  return cc.charAt(0).toUpperCase() + cc.slice(1)
}

export async function scaffold(config: ScaffoldConfig): Promise<string[]> {
  const root = join(config.dir, config.name)
  const created: string[] = []

  const write = async (path: string, content: string) => {
    const full = join(root, path)
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(full, content, 'utf8')
    created.push(full)
  }

  await write('package.json', generatePackageJson(config))
  await write('tsconfig.json', generateTsConfig())
  await write('tsup.config.ts', generateTsupConfig())
  await write('src/index.ts', generateIndexSource(config.type, config.name))
  await write('tests/index.test.ts', generateTest(config.type, config.name))
  await write('README.md', generateReadme(config))

  return created
}
