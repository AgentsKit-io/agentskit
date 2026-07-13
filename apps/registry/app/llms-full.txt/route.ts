import { source } from '@/lib/source'
import { resolveStructuredData, structuredText } from '@/lib/docs-text'

export const revalidate = 3600

export async function GET() {
  const [registry, docs] = await Promise.all([
    fetch('https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main/public/llms-full.txt', {
    next: { revalidate: 3600 },
    }),
    Promise.all(source.getPages().map(async (page) => ({
      title: page.data.title,
      url: page.url,
      text: structuredText(await resolveStructuredData(page.data)),
    }))),
  ])
  if (!registry.ok) return new Response('Registry context is temporarily unavailable.', { status: 503 })
  const documentation = docs.map((page) => `## ${page.title}\n\nURL: https://registry.agentskit.io${page.url}\n\n${page.text}`).join('\n\n')
  const body = `# AgentsKit Registry documentation\n\n${documentation}\n\n# Agent catalog\n\n${await registry.text()}`
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
