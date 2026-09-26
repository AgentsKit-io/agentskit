import { createElement } from 'react'
import ecosystem from '@/lib/ecosystem.json'

type FooterLink = { text: string; href: string }
type FooterColumn = { title: string; links: readonly FooterLink[] }

const REPO = 'AgentsKit-io/agentskit'

const FOOTER_PRODUCTS = ecosystem.products
  .filter((product) => product.public && product.navigation.showInBar)
  .sort((a, b) => a.navigation.order - b.navigation.order)

const LOCAL_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'Start',
    links: [
      { text: 'Get started', href: '/docs/get-started/getting-started/build-your-first-agent' },
      { text: 'Live examples', href: '/docs/reference/examples' },
      { text: 'Recipes', href: '/docs/reference/recipes' },
      { text: 'Stack builder', href: '/stack' },
      { text: 'Learn', href: '/learn' },
    ],
  },
  {
    title: 'Build',
    links: [
      { text: 'Chat UI', href: '/docs/ui' },
      { text: 'CLI', href: '/docs/reference/packages/cli' },
      { text: 'Runtime', href: '/docs/reference/packages/runtime' },
      { text: 'Tools & MCP', href: '/docs/agents/tools' },
      { text: 'RAG & Memory', href: '/docs/data/memory' },
      { text: 'All packages', href: '/ecosystem' },
    ],
  },
  {
    title: 'Community',
    links: [
      { text: 'Contribute', href: '/docs/reference/contribute' },
      { text: 'Showcase', href: '/showcase' },
      { text: 'Blog', href: '/blog' },
      { text: 'npm', href: 'https://www.npmjs.com/org/agentskit' },
      { text: 'For agents · llms.txt', href: '/llms.txt' },
    ],
  },
]

/**
 * `<agentskit-footer>` from the shared shell. The children are the server-rendered
 * fallback: product-owned columns (projected into the upgraded footer through the
 * `local` slot) plus plain ecosystem, repository, and license links for no-JS readers.
 */
export function EcosystemFooter() {
  return createElement(
    'agentskit-footer',
    {
      current: 'agentskit',
      repo: REPO,
      description: 'The open-source TypeScript foundation for production AI agents: runtime, tools, memory, RAG, and UI bindings.',
    },
    <div slot="local" className="ak-footer-local">
      {LOCAL_COLUMNS.map((column) => (
        <div key={column.title} className="ak-footer-col" data-footer-column={column.title}>
          <h2 className="ak-footer-col__title">{column.title}</h2>
          <ul>
            {column.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.text}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>,
    <nav aria-label="AgentsKit ecosystem" className="ak-footer-fallback">
      {FOOTER_PRODUCTS.map((product) => (
        <a key={product.id} href={product.surfaces.home} aria-current={product.id === 'agentskit' ? 'page' : undefined}>
          {product.name}
        </a>
      ))}
      <a href={`https://github.com/${REPO}`}>GitHub</a>
      <a href={`https://github.com/${REPO}/blob/main/LICENSE`}>MIT License</a>
    </nav>,
  )
}
