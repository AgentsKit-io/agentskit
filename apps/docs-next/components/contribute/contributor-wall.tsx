'use client'

import { useEffect, useState } from 'react'
import { fetchContributors, fetchCounts, GOOD_FIRST_URL, HELP_WANTED_URL, ISSUES_URL, REPO_URL, DISCUSSIONS_URL } from './github-data'

type Contributor = { login: string; avatar_url: string; html_url: string }
type Counts = { contributors: number; openIssues: number; goodFirst: number; helpWanted: number }

export function ContributorWall({ compact = false }: { compact?: boolean }) {
  const [contribs, setContribs] = useState<Contributor[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchContributors().then(c => { if (!cancelled) setContribs(c) })
    fetchCounts().then(c => { if (!cancelled) setCounts(c) })
    return () => { cancelled = true }
  }, [])

  const avatarSize = compact ? 28 : 36
  const maxShow = compact ? 20 : 30

  return (
    <div className="rounded-2xl border border-ak-border bg-ak-surface/40 p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">
            Built in the open
          </div>
          <h3 className="text-xl font-bold text-ak-foam md:text-2xl">
            {counts?.contributors ? `${counts.contributors} contributors — and counting` : 'Built by contributors like you'}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-xs">
          <StatPill href={ISSUES_URL} label="open issues" value={counts?.openIssues ?? '…'} tone="default" />
          <StatPill href={GOOD_FIRST_URL} label="good first" value={counts?.goodFirst ?? '…'} tone="green" />
          <StatPill href={HELP_WANTED_URL} label="help wanted" value={counts?.helpWanted ?? '…'} tone="blue" />
        </div>
      </div>

      {contribs.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {contribs.slice(0, maxShow).map(c => (
            <a
              key={c.login}
              href={c.html_url}
              target="_blank"
              rel="noopener noreferrer"
              title={c.login}
              className="inline-block overflow-hidden rounded-full border border-ak-border transition hover:border-ak-blue"
              style={{ width: avatarSize, height: avatarSize }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.avatar_url}
                alt={c.login}
                width={avatarSize}
                height={avatarSize}
                loading="lazy"
                style={{ display: 'block' }}
              />
            </a>
          ))}
          {contribs.length > maxShow && (
            <a
              href={`${REPO_URL}/graphs/contributors`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-full border border-ak-border bg-ak-midnight font-mono text-xs text-ak-graphite hover:border-ak-blue hover:text-ak-blue"
              style={{ width: avatarSize, height: avatarSize }}
            >
              +{contribs.length - maxShow}
            </a>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 font-mono text-xs">
        <a href={GOOD_FIRST_URL} className="rounded-md bg-ak-foam px-4 py-2 font-semibold text-ak-midnight hover:bg-white" target="_blank" rel="noopener noreferrer">
          Grab a good-first-issue →
        </a>
        <a href="/docs/contribute" className="rounded-md border border-ak-border px-4 py-2 text-ak-foam hover:border-ak-blue">
          Read the contribute guide
        </a>
        <a href={DISCUSSIONS_URL} className="rounded-md border border-ak-border px-4 py-2 text-ak-foam hover:border-ak-blue" target="_blank" rel="noopener noreferrer">
          Join discussions
        </a>
      </div>
    </div>
  )
}

function StatPill({
  href,
  label,
  value,
  tone,
}: {
  href: string
  label: string
  value: number | string
  tone: 'default' | 'green' | 'blue'
}) {
  const toneClass =
    tone === 'green'
      ? 'text-ak-green border-ak-green/30 bg-ak-green/5'
      : tone === 'blue'
      ? 'text-ak-blue border-ak-blue/30 bg-ak-blue/5'
      : 'text-ak-graphite border-ak-border bg-ak-midnight'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 transition hover:opacity-80 ${toneClass}`}
    >
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-[11px] uppercase tracking-wider opacity-80">{label}</span>
    </a>
  )
}
