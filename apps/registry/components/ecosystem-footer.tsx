import { createElement } from 'react'
import ecosystemManifest from '../../../ecosystem.json'

type FooterLink = { text: string; href: string }
type FooterColumn = { title: string; links: readonly FooterLink[] }

const REPO = 'AgentsKit-io/agentskit-registry'

const publicProducts = ecosystemManifest.products
  .filter((product) => product.navigation.showInBar)
  .sort((left, right) => (left.navigation.order ?? 0) - (right.navigation.order ?? 0))

const LOCAL_COLUMNS: readonly FooterColumn[] = [
  { title: 'Start', links: [
    { text: 'Browse agents', href: '/agents' },
    { text: 'Quick start', href: '/docs/quick-start' },
    { text: 'Documentation', href: '/docs' },
  ] },
  { title: 'Build', links: [
    { text: 'Contribute an agent', href: `https://github.com/${REPO}/blob/main/CONTRIBUTING.md` },
    { text: 'Registry JSON', href: '/r/index.json' },
    { text: 'MCP endpoint', href: '/api/mcp' },
    { text: 'For agents · llms.txt', href: '/llms.txt' },
  ] },
]

/**
 * `<agentskit-footer>` from the shared shell. Children are the server-rendered fallback:
 * Registry-owned columns (projected through the `local` slot once upgraded) plus plain
 * ecosystem, repository, and license links for no-JS readers.
 */
export function EcosystemFooter() {
  return createElement(
    'agentskit-footer',
    {
      current: 'registry',
      repo: REPO,
      description: 'Ready-to-use TypeScript agents. Copy working source into your project and own every line.',
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
      {publicProducts.map((product) => (
        <a key={product.id} href={product.surfaces.home} aria-current={product.id === 'registry' ? 'page' : undefined}>
          {product.name}
        </a>
      ))}
      <a href={`https://github.com/${REPO}`}>GitHub</a>
      <a href={`https://github.com/${REPO}/blob/main/LICENSE`}>MIT License</a>
    </nav>,
  )
}
