import { LINKS } from './links'

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="mt-10 border-t border-[var(--color-border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-[var(--color-fg-soft)]">
          <span aria-hidden className="inline-block h-4 w-4 rounded bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-soft)]" />
          <span>AgentsKit · MIT licensed · {YEAR}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-[var(--color-fg-soft)]">
          <a href={LINKS.docs} className="hover:text-[var(--color-fg)]">Docs</a>
          <a href={LINKS.github} className="hover:text-[var(--color-fg)]">GitHub</a>
          <a href={LINKS.discord} className="hover:text-[var(--color-fg)]">Discord</a>
          <a href={LINKS.npm} className="hover:text-[var(--color-fg)]">npm</a>
          <a href={LINKS.manifesto} className="hover:text-[var(--color-fg)]">Manifesto</a>
          <a href={LINKS.roadmap} className="hover:text-[var(--color-fg)]">Roadmap</a>
        </nav>
      </div>
    </footer>
  )
}
