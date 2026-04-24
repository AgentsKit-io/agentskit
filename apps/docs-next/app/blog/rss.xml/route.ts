import { allBlogPosts, slugOf } from '@/lib/blog'

const SITE = 'https://www.agentskit.io'

function xmlEscape(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] ?? c)
}

export function GET() {
  const posts = allBlogPosts()
  const items = posts
    .map((p) => {
      const slug = slugOf(p)
      const link = `${SITE}/blog/${slug}`
      const pubDate = new Date(p.date + 'T00:00:00Z').toUTCString()
      return [
        '  <item>',
        `    <title>${xmlEscape(p.title)}</title>`,
        `    <link>${link}</link>`,
        `    <guid>${link}</guid>`,
        `    <pubDate>${pubDate}</pubDate>`,
        `    <description>${xmlEscape(p.description ?? '')}</description>`,
        `    <author>${xmlEscape(p.author)}</author>`,
        ...p.tags.map((t) => `    <category>${xmlEscape(t)}</category>`),
        '  </item>',
      ].join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>AgentsKit.js blog</title>
  <link>${SITE}/blog</link>
  <description>Releases, design notes, and deep dives from the AgentsKit.js team.</description>
  <language>en</language>
${items}
</channel>
</rss>
`
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
}
