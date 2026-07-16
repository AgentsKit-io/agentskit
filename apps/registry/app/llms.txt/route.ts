import { source } from '@/lib/source'
import { getRegistryIndex } from '@/lib/registry'
import ecosystemManifest from '../../../../ecosystem.json'
import { formatEcosystemLlmsBlock } from '@/lib/ecosystem-llms-block'

export const revalidate = 3600
const SITE = 'https://registry.agentskit.io'

export async function GET() {
  const agents = await getRegistryIndex()
  const products = (
    ecosystemManifest.products as Array<{
      id: string
      name: string
      role?: string
      promise: string
      maturity?: string
      surfaces: { home?: string; docs?: string; llms?: string }
      navigation: { order: number }
    }>
  ).toSorted((left, right) => left.navigation.order - right.navigation.order)

  const lines = [
    '# AgentsKit Registry',
    '',
    '> Ready-to-use, provider-agnostic AI agents. Copy the source into your project and own the code.',
    '',
    ...formatEcosystemLlmsBlock({
      products,
      currentProductId: 'registry',
      prefer: 'docs',
    }),
    '## Documentation',
    '',
    ...source.getPages().map((page) => `- [${page.data.title}](${SITE}${page.url}): ${page.data.description ?? ''}`),
    '',
    '## Agents',
    '',
    ...agents.map((agent) => `- [${agent.title}](${SITE}/agents/${agent.id}): ${agent.description} Install: \`npx agentskit add ${agent.id}\`.`),
    '',
    '## Machine-readable resources',
    '',
    `- [Registry index](${SITE}/r/index.json)`,
    `- [Deterministic site config](${SITE}/deterministic/site-config.json)`,
    `- [Deterministic knowledge artifact](${SITE}/deterministic/knowledge.json)`,
    `- [Full agent context](${SITE}/llms-full.txt)`,
    `- [Sitemap](${SITE}/sitemap.xml)`,
    `- [MCP endpoint](${SITE}/api/mcp)`,
    '',
  ]
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
