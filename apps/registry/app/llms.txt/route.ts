import { source } from '@/lib/source'
import { getRegistryIndex } from '@/lib/registry'
import ecosystemManifest from '../../../../ecosystem.json'

export const revalidate = 3600
const SITE = 'https://registry.agentskit.io'

interface EcosystemProduct {
  readonly id: string
  readonly name: string
  readonly promise: string
  readonly public: boolean
  readonly distributionClass: string
  readonly surfaces: {
    readonly docs: string
    readonly llms?: string
  }
  readonly navigation: {
    readonly order: number
  }
}

const ecosystemProducts = (ecosystemManifest.products as readonly EcosystemProduct[])
  .toSorted((left, right) => left.navigation.order - right.navigation.order)

function ecosystemLine(product: EcosystemProduct): string {
  const current = product.id === 'registry' ? ' **(current)**' : ''
  const machineIndex = product.surfaces.llms ? ` Machine index: ${product.surfaces.llms}` : ''
  return `- [${product.name}](${product.surfaces.docs})${current} — ${product.promise}${machineIndex}`
}

export async function GET() {
  const agents = await getRegistryIndex()
  const publicProducts = ecosystemProducts.filter((product) => product.public)
  const managedProducts = ecosystemProducts.filter((product) => product.distributionClass === 'managed-service')
  const lines = [
    '# AgentsKit Registry',
    '',
    '> Ready-to-use, provider-agnostic AI agents. Copy the source into your project and own the code.',
    '',
    '## AgentsKit ecosystem',
    '',
    ...publicProducts.map(ecosystemLine),
    '',
    ...(managedProducts.length > 0 ? [
      '## Optional managed layer',
      '',
      ...managedProducts.map((product) => `${ecosystemLine(product)} This layer is optional and is not part of the open-source package catalog.`),
      '',
    ] : []),
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
