import { LINKS } from './links'

export function InstallCta() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h2 className="mb-6 text-3xl font-semibold tracking-tight">Install in seconds</h2>
      <div className="mx-auto inline-flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-5 py-4 font-mono text-sm">
        <span className="text-[var(--color-fg-soft)]">$</span>
        <span>pnpm add @agentskit/react @agentskit/adapters</span>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href={LINKS.docs}
          className="rounded-md bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-accent-soft)]"
        >
          Read the docs
        </a>
        <a
          href={LINKS.discord}
          className="rounded-md border border-[var(--color-border)] px-5 py-3 text-sm font-medium hover:border-[var(--color-accent)]"
        >
          Join Discord
        </a>
      </div>
    </section>
  )
}
