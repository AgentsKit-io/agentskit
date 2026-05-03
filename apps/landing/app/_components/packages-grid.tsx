import { LINKS } from './links'

const PACKAGES = [
  { name: 'core', tag: 'foundation' },
  { name: 'adapters', tag: 'providers' },
  { name: 'react', tag: 'ui' },
  { name: 'vue', tag: 'ui' },
  { name: 'svelte', tag: 'ui' },
  { name: 'solid', tag: 'ui' },
  { name: 'ink', tag: 'ui' },
  { name: 'angular', tag: 'ui' },
  { name: 'react-native', tag: 'ui' },
  { name: 'runtime', tag: 'agents' },
  { name: 'tools', tag: 'agents' },
  { name: 'skills', tag: 'agents' },
  { name: 'memory', tag: 'data' },
  { name: 'rag', tag: 'data' },
  { name: 'sandbox', tag: 'safety' },
  { name: 'observability', tag: 'ops' },
  { name: 'eval', tag: 'ops' },
  { name: 'cli', tag: 'tooling' },
  { name: 'templates', tag: 'tooling' },
] as const

export function PackagesGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Nineteen focused packages</h2>
        <p className="mt-3 text-[var(--color-fg-soft)]">Pick what you need. Mix freely. Stay in plain JavaScript.</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {PACKAGES.map(pkg => (
          <li key={pkg.name}>
            <a
              href={`${LINKS.docs}/reference/packages/${pkg.name}`}
              className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 transition hover:border-[var(--color-accent)]"
            >
              <div className="font-mono text-sm">@agentskit/{pkg.name}</div>
              <div className="mt-1 text-xs text-[var(--color-fg-soft)]">{pkg.tag}</div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
