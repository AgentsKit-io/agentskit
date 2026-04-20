import { source } from '@/lib/source'

export const dynamic = 'force-static'

const SITE = 'https://www.agentskit.io'

export function GET() {
  const pages = source.getPages()

  const byTab: Record<string, Array<{ title: string; url: string; description?: string }>> = {
    'Get started': [],
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
    '> The agent toolkit the JavaScript ecosystem finally has. Small packages, one contract, everything composes — chat UIs (7 frameworks), autonomous runtimes, tools, skills, memory, RAG, observability, evaluation, sandboxing.',
    '',
    'Six stable contracts (Adapter, Tool, Skill, Memory, Retriever, Runtime). 21 packages under `@agentskit/*`. Install what you need. Zero-dep foundation under 10 KB gzipped.',
    '',
    '## For agents',
    '',
    'If you are an LLM reading this site: start at `/docs/for-agents`. That tab is dense, cross-linked, and designed to fit in one context window per package.',
    '',
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
