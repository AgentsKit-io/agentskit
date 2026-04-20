import fs from 'node:fs'
import path from 'node:path'
import { source } from '@/lib/source'

export const dynamic = 'force-static'

const SITE = 'https://www.agentskit.io'
const CONTENT_DIR = path.join(process.cwd(), 'content/docs')

function readMdx(slug: string): { body: string; title?: string; description?: string } {
  const candidates = [
    path.join(CONTENT_DIR, `${slug}.mdx`),
    path.join(CONTENT_DIR, slug, 'index.mdx'),
    path.join(CONTENT_DIR, `${slug}.md`),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8')
      const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
      if (m) {
        const fm = m[1]
        const body = m[2].trim()
        const title = fm.match(/^title:\s*(.*)$/m)?.[1]?.replace(/^['"]|['"]$/g, '')
        const description = fm.match(/^description:\s*(.*)$/m)?.[1]?.replace(/^['"]|['"]$/g, '')
        return { body, title, description }
      }
      return { body: raw.trim() }
    }
  }
  return { body: '' }
}

export function GET() {
  const pages = source.getPages()
  const ordered = [...pages].sort((a, b) => a.slugs.join('/').localeCompare(b.slugs.join('/')))

  const lines: string[] = [
    '# AgentsKit.js — full docs',
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
