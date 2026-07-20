import ecosystemManifest from '../../../../../ecosystem.json'

const publicProducts = ecosystemManifest.products
  .filter((product) => product.navigation.showInBar)
  .sort((left, right) => (left.navigation.order ?? 0) - (right.navigation.order ?? 0))

const productLinks = [
  { label: 'Browse agents', href: '/agents' },
  { label: 'Quick start', href: '/docs/quick-start' },
  { label: 'Documentation', href: '/docs' },
  { label: 'Contribute an agent', href: 'https://github.com/AgentsKit-io/agentskit-registry/blob/main/CONTRIBUTING.md' },
]

const resourceLinks = [
  { label: 'llms.txt', href: '/llms.txt' },
  { label: 'Registry JSON', href: '/r/index.json' },
  { label: 'MCP endpoint', href: '/api/mcp' },
  { label: 'GitHub', href: 'https://github.com/AgentsKit-io/agentskit-registry' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-ak-border bg-ak-surface px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold text-ak-foam">AgentsKit Registry</p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-ak-graphite">
            Shadcn-like agents installed as readable TypeScript. Start from working source and keep ownership of every line.
          </p>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ak-graphite">
            MIT · source-owned · no registry runtime
          </p>
        </div>
        <FooterColumn title="Registry" links={productLinks} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ak-foam">Ecosystem</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ak-graphite">
            {publicProducts.map((product) => (
              <li key={product.id}>
                {product.id === 'registry' ? (
                  <span className="font-medium text-ak-blue" aria-current="page">{product.shortName}</span>
                ) : (
                  <a className="transition hover:text-ak-foam" href={product.surfaces.home}>{product.shortName}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
        <FooterColumn title="Resources" links={resourceLinks} />
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ak-foam">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-ak-graphite">
        {links.map((link) => (
          <li key={link.href}>
            <a className="transition hover:text-ak-foam" href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
