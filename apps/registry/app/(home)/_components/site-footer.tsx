import ecosystemManifest from '../../../../../ecosystem.json'

const publicProducts = ecosystemManifest.products
  .filter((product) => product.navigation.showInBar)
  .sort((left, right) => (left.navigation.order ?? 0) - (right.navigation.order ?? 0))

const columns = [
  { title: 'Start', links: [
    { text: 'Browse agents', href: '/agents' },
    { text: 'Quick start', href: '/docs/quick-start' },
    { text: 'Documentation', href: '/docs' },
  ] },
  { title: 'Build', links: [
    { text: 'Contribute an agent', href: 'https://github.com/AgentsKit-io/agentskit-registry/blob/main/CONTRIBUTING.md' },
    { text: 'Registry JSON', href: '/r/index.json' },
    { text: 'MCP endpoint', href: '/api/mcp' },
  ] },
  { title: 'Ecosystem', links: publicProducts.map((product) => ({
    text: product.shortName,
    href: product.surfaces.home,
    current: product.id === 'registry',
  })) },
  { title: 'Community', links: [
    { text: 'GitHub', href: 'https://github.com/AgentsKit-io/agentskit-registry' },
    { text: 'For agents · llms.txt', href: '/llms.txt' },
  ] },
]

export function SiteFooter() {
  return (
    <footer className="ak-site-footer px-4 pt-16 pb-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="min-w-0">
            <span className="font-mono text-base font-bold tracking-tight text-ak-foam">AgentsKit Registry</span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ak-graphite">
              Ready-to-use TypeScript agents. Copy working source into your project and own every line.
            </p>
            <a href="https://github.com/AgentsKit-io/agentskit-registry" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-md bg-ak-surface/60 px-3 py-1.5 font-mono text-xs text-ak-graphite transition hover:text-ak-foam">GitHub</a>
          </div>

          {columns.map((column) => (
            <div key={column.title} data-footer-column={column.title} className="min-w-0">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ak-graphite">{column.title}</h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} aria-current={'current' in link && link.current ? 'page' : undefined} className={`text-sm transition hover:text-ak-blue ${'current' in link && link.current ? 'font-semibold text-ak-foam' : 'text-ak-graphite'}`}>
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
