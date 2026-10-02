// Cloudflare Workers build only (vite.config.ts aliases app/llms-full.txt/route.ts here): Workers
// have no filesystem, so page bodies come from the snapshot scripts/gen-llms-full.mjs writes in
// build:vinext. Output matches the Node route. The certified route file stays unchanged.
import { source } from '@/lib/source'
import PAGES from 'virtual:llms-full-pages'

export const dynamic = 'force-static'

const SITE = 'https://www.agentskit.io'

type PageText = { body: string; title?: string; description?: string }

function readMdx(slug: string): PageText {
  return PAGES[slug] ?? { body: '' }
}

export function GET() {
  const pages = source.getPages()
  const ordered = [...pages].sort((a, b) => a.slugs.join('/').localeCompare(b.slugs.join('/')))

  const lines: string[] = [
    '# AgentsKit — full docs',
    '',
    `> Every page of ${SITE}/docs flattened into one file. Designed for LLM ingestion. See also ${SITE}/llms.txt for the index.`,
    '',
    `Generated at build time from ${ordered.length} docs pages.`,
    '',
  ]

  for (const p of ordered) {
    const slug = p.slugs.join('/')
    const url = slug ? `${SITE}/docs/${slug}` : `${SITE}/docs`
    const { body, title, description } = readMdx(slug)
    const heading = title ?? slug

    lines.push('---')
    lines.push(`# ${heading}`)
    lines.push('')
    lines.push(`Source: ${url}`)
    if (description) {
      lines.push('')
      lines.push(`> ${description}`)
    }
    lines.push('')
    if (body) lines.push(body)
    lines.push('')
  }

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
