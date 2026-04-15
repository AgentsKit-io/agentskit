import Link from 'next/link'
import { GOOD_FIRST_URL, HELP_WANTED_URL, packageIssuesUrl, REPO_URL } from './github-data'

type Props = {
  pkg?: string
  title?: string
  body?: string
}

export function ContributeCallout({ pkg, title, body }: Props) {
  const issuesHref = pkg ? packageIssuesUrl(pkg) : HELP_WANTED_URL
  return (
    <aside
      style={{
        marginTop: '2.5rem',
        padding: '1.25rem 1.5rem',
        borderRadius: 12,
        border: '1px solid var(--color-ak-border)',
        background: 'var(--color-ak-surface)',
      }}
    >
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-ak-blue)', marginBottom: 6 }}>
        Help build this
      </div>
      <h3 style={{ margin: 0, marginBottom: 8, fontSize: '1.1rem', color: 'var(--color-ak-foam)' }}>
        {title ?? (pkg ? `Improve @agentskit/${pkg}` : 'Improve AgentsKit')}
      </h3>
      <p style={{ margin: 0, marginBottom: 12, color: 'var(--color-ak-graphite)', lineHeight: 1.55 }}>
        {body ??
          (pkg
            ? `Found a bug? Missing a provider? This package is maintained in the open — grab an issue or send a PR.`
            : `AgentsKit is built in the open. Missing a feature, a fix, or docs? We'd love your PR.`)}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link
          href={issuesHref}
          style={linkBtnPrimary}
        >
          {pkg ? `Open ${pkg} issues →` : 'Help-wanted issues →'}
        </Link>
        <Link href={GOOD_FIRST_URL} style={linkBtn}>
          Good first issues
        </Link>
        <Link href="/docs/contribute" style={linkBtn}>
          Contribute guide
        </Link>
        <Link href={REPO_URL} style={linkBtn}>
          GitHub
        </Link>
      </div>
    </aside>
  )
}

const linkBtnBase: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid var(--color-ak-border)',
  textDecoration: 'none',
  fontFamily: 'var(--font-mono)',
}
const linkBtn: React.CSSProperties = {
  ...linkBtnBase,
  color: 'var(--color-ak-foam)',
  background: 'transparent',
}
const linkBtnPrimary: React.CSSProperties = {
  ...linkBtnBase,
  color: 'var(--color-ak-midnight)',
  background: 'var(--color-ak-foam)',
  borderColor: 'var(--color-ak-foam)',
}
