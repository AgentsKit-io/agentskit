import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../..')
const docsRoot = resolve(__dirname, '../content/docs')

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

describe('documentation and package contract surfaces', () => {
  it('keeps built-in error docs links canonical and documented', () => {
    const source = read('packages/core/src/errors.ts')
    const docs = read('apps/docs-next/content/docs/get-started/concepts/errors.mdx')
    const coreReference = read('apps/docs-next/content/docs/reference/packages/core.mdx')

    expect(source).toContain("${DOCS_BASE}/data/providers")
    expect(source).toContain("${DOCS_BASE}/agents/tools")
    expect(source).toContain("${DOCS_BASE}/data/memory")
    expect(source).toContain("${DOCS_BASE}/get-started/concepts/errors")

    for (const code of source.matchAll(/\n\s+(AK_[A-Z0-9_]+):/g)) {
      expect(docs).toContain(code[1]!)
      expect(coreReference).toContain(code[1]!)
    }

    expect(docs).toContain('RuntimeError')
    expect(docs).toContain('SandboxError')
    expect(docs).toContain('SkillError')
    expect(docs).toContain('RagErrorCodes.AK_RAG_RERANK_FAILED')
    expect(docs).not.toContain('openaiAdapter()')
  })

  it('keeps package README and metadata links on current guide routes', () => {
    const packageDirs = [
      'adapters', 'angular', 'cli', 'core', 'eval-braintrust', 'eval', 'ink', 'mcp',
      'memory', 'observability-langfuse', 'observability', 'rag', 'react-native', 'react',
      'runtime', 'sandbox', 'skills', 'solid', 'statechart', 'svelte', 'templates', 'tools',
      'validation', 'vue',
    ]

    for (const packageDir of packageDirs) {
      const readme = read(`packages/${packageDir}/README.md`)
      const manifest = JSON.parse(read(`packages/${packageDir}/package.json`)) as { homepage?: string }
      expect(readme.includes('https://www.agentskit.io/docs/packages/')).toBe(false)
      expect(readme.includes('https://www.agentskit.io/docs/recipes/')).toBe(false)
      expect(readme.includes('https://www.agentskit.io/docs/tools/')).toBe(false)
      expect(readme.includes('https://www.agentskit.io/docs/adapters/')).toBe(false)
      expect(readme.includes('https://www.agentskit.io/docs/memory/')).toBe(false)
      expect(readme.includes('https://www.agentskit.io/docs/configuration/')).toBe(false)
      expect(manifest.homepage?.includes('https://www.agentskit.io/docs/packages/')).toBe(false)
    }

    expect(read('packages/mcp/README.md')).toContain('/docs/agents/tools/mcp')
    expect(read('packages/integrations/README.md')).toContain('/docs/for-agents/integrations')
    const cliTemplate = read('packages/cli/src/init.ts')
    expect(cliTemplate).toContain('https://www.agentskit.io/docs/get-started/concepts/skill')
    expect(cliTemplate).toContain('https://www.agentskit.io/docs/reference/recipes/rag-chat')
    expect(cliTemplate).not.toContain('https://www.agentskit.io/docs/concepts/skill')
    expect(cliTemplate).not.toContain('https://www.agentskit.io/docs/recipes/rag-chat')
  })

  it('keeps high-use RAG and UI pages free of known invented signatures', () => {
    const pages = [
      'data/rag/create-rag.mdx',
      'data/rag/rerank.mdx',
      'data/rag/loaders.mdx',
      'data/rag/chunking.mdx',
      'data/providers/embedders.mdx',
      'ui/use-chat.mdx',
    ].map((path) => readFileSync(resolve(docsRoot, path), 'utf8')).join('\n')
    const executableSnippets = [...pages.matchAll(/```(?:ts|tsx)\n([\s\S]*?)```/g)]
      .map((match) => match[1]!)
      .join('\n')

    expect(executableSnippets).not.toContain('cohereReranker')
    expect(executableSnippets).not.toContain('bgeReranker')
    expect(executableSnippets).not.toContain("split: 'paragraph'")
    expect(pages).not.toContain('LoadedDocument[]')
    expect(pages).not.toContain('awaiting-tool')
    expect(pages).not.toContain('rag?: Retriever')
    expect(pages).not.toContain('system?: string')
    expect(pages).toContain('createRerankedRetriever(base,')
    expect(pages).toContain('chunkText(text,')
    expect(pages).toContain('type EmbedFn = (text: string) => Promise<number[]>')
  })

  it('keeps contributor and package handoff paths on the current docs tree', () => {
    expect(read('CONTRIBUTING.md')).not.toContain('content/docs/recipes/')
    expect(read('packages/react/CONVENTIONS.md')).not.toContain('content/docs/recipes/')
    expect(read('packages/react/CONVENTIONS.md')).toContain('content/docs/reference/recipes/custom-adapter.mdx')
  })
})
