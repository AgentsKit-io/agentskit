import { source } from '@/lib/source'
import { counts } from '@/lib/ecosystem-stats'
import ecosystem from '@/lib/ecosystem.json'
import { formatEcosystemLlmsBlock } from '@agentskit/doc-bridge'

export const dynamic = 'force-static'

const SITE = 'https://www.agentskit.io'

/** Shared seven-product mesh from ecosystem.json (canonical template). */
function ecosystemLines(): string[] {
  return formatEcosystemLlmsBlock({
    products: ecosystem.products as Array<{
      id: string
      name: string
      role?: string
      promise: string
      maturity?: string
      surfaces: { home?: string; docs?: string; llms?: string }
    }>,
    currentProductId: 'agentskit',
  })
}

export function GET() {
  const pages = source.getPages()

  const byTab: Record<string, Array<{ title: string; url: string; description?: string }>> = {
    'Get started': [],
    'Use cases': [],
    'Compare': [],
    'UI': [],
    'Agents': [],
    'Data': [],
    'Production': [],
    'For agents': [],
    'Reference': [],
  }

  for (const p of pages) {
    const slug = p.slugs.join('/')
    if (!slug) continue
    const url = `${SITE}/docs/${slug}`
    const title = (p.data as { title?: string }).title ?? slug
    const description = (p.data as { description?: string }).description
    const entry = { title, url, description }
    if (slug.startsWith('get-started/')) byTab['Get started'].push(entry)
    else if (slug.startsWith('use-cases/') || slug === 'use-cases') byTab['Use cases'].push(entry)
    else if (slug.startsWith('compare/') || slug === 'compare') byTab['Compare'].push(entry)
    else if (slug.startsWith('ui/')) byTab['UI'].push(entry)
    else if (slug.startsWith('agents/')) byTab['Agents'].push(entry)
    else if (slug.startsWith('data/')) byTab['Data'].push(entry)
    else if (slug.startsWith('production/')) byTab['Production'].push(entry)
    else if (slug.startsWith('for-agents/')) byTab['For agents'].push(entry)
    else if (slug.startsWith('reference/')) byTab['Reference'].push(entry)
  }

  const lines: string[] = [
    '# AgentsKit.js',
    '',
    `> Foundation library for JavaScript agents. Small packages, one contract, everything composes — UI bindings (${counts.frameworkBindings} frameworks), autonomous runtimes, tools, skills, memory, RAG, observability, evaluation, sandboxing. Product chat UI is AgentsKit Chat (sibling), not this monorepo alone.`,
    '',
    `Six stable contracts (Adapter, Tool, Skill, Memory, Retriever, Runtime). ${counts.packages} packages under \`@agentskit/*\`. Install what you need. Zero-dep foundation under the 10 KB gzip budget.`,
    '',
    '## For agents',
    '',
    'If you are an LLM reading this site: start at `/docs/for-agents`. That tab is dense, cross-linked, and designed to fit in one context window per package.',
    '',
    ...ecosystemLines(),
  ]

  for (const [tab, entries] of Object.entries(byTab)) {
    if (entries.length === 0) continue
    lines.push(`## ${tab}`)
    lines.push('')
    for (const e of entries) {
      lines.push(`- [${e.title}](${e.url})${e.description ? `: ${e.description}` : ''}`)
    }
    lines.push('')
  }

  lines.push('## Optional')
  lines.push('')
  lines.push(`- [Full markdown index](${SITE}/llms-full.txt): complete text of every docs page in one file`)
  lines.push(`- [Sitemap](${SITE}/sitemap.xml): machine-readable URL list`)
  lines.push(`- [GitHub](https://github.com/AgentsKit-io/agentskit): source + issues`)
  lines.push('')

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
