import { LINKS } from './links'
import { CommunityLink, EcoLink } from './tracked-link'

const YEAR = new Date().getFullYear()
const linkCls = 'hover:text-[var(--color-fg)]'

export function Footer() {
  return (
    <footer className="mt-10 border-t border-[var(--color-border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-[var(--color-fg-soft)]">
          <span aria-hidden className="inline-block h-4 w-4 rounded bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-soft)]" />
          <span>AgentsKit · MIT licensed · {YEAR}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-fg-soft)]">
          <a href={LINKS.docs} className={linkCls}>Docs</a>
          <CommunityLink href={LINKS.github} target="github" className={linkCls}>GitHub</CommunityLink>
          <CommunityLink href={LINKS.discord} target="discord" className={linkCls}>Discord</CommunityLink>
          <CommunityLink href={LINKS.npm} target="npm" className={linkCls}>npm</CommunityLink>
          <a href={LINKS.manifesto} className={linkCls}>Manifesto</a>
          <a href={LINKS.roadmap} className={linkCls}>Roadmap</a>
          <span aria-hidden className="text-[var(--color-border)]">·</span>
          <EcoLink href={LINKS.playbook} target="playbook" placement="footer" className={linkCls}>Playbook</EcoLink>
          <EcoLink href={LINKS.registry} target="registry" placement="footer" className={linkCls}>Registry</EcoLink>
          <EcoLink href={LINKS.akos} target="akos" placement="footer" className={linkCls}>AKOS</EcoLink>
        </nav>
      </div>
    </footer>
  )
}
