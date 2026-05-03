import { LINKS } from './links'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-6 w-6 rounded-md bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-soft)]" />
          AgentsKit
        </a>
        <nav className="flex items-center gap-6 text-sm text-[var(--color-fg-soft)]">
          <a href={LINKS.docs} className="hover:text-[var(--color-fg)]">Docs</a>
          <a href={LINKS.roadmap} className="hover:text-[var(--color-fg)]">Roadmap</a>
          <a href={LINKS.discord} className="hover:text-[var(--color-fg)]">Discord</a>
          <a
            href={LINKS.github}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-soft)]"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}
