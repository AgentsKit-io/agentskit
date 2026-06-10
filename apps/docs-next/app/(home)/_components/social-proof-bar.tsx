'use client'

import { useEffect, useState } from 'react'
import { counts } from '@/lib/ecosystem-stats'

const GITHUB_REPO = 'AgentsKit-io/agentskit'
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`
const NPM_ORG = 'https://www.npmjs.com/org/agentskit'

const PACKAGES = [
  '@agentskit/adapters',
  '@agentskit/cli',
  '@agentskit/core',
  '@agentskit/eval',
  '@agentskit/ink',
  '@agentskit/memory',
  '@agentskit/observability',
  '@agentskit/rag',
  '@agentskit/react',
  '@agentskit/runtime',
  '@agentskit/sandbox',
  '@agentskit/skills',
  '@agentskit/templates',
  '@agentskit/tools',
]

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

async function fetchDownloads(pkg: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`,
    )
    if (!res.ok) return 0
    const data: { downloads?: number } = await res.json()
    return typeof data.downloads === 'number' ? data.downloads : 0
  } catch {
    return 0
  }
}

async function fetchStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
    if (!res.ok) return null
    const data: { stargazers_count?: number } = await res.json()
    return data.stargazers_count ?? null
  } catch {
    return null
  }
}

async function fetchContributorCount(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=1&anon=1`,
    )
    if (!res.ok) return null
    const link = res.headers.get('link') ?? ''
    const m = link.match(/page=(\d+)>; rel="last"/)
    if (m) return Number(m[1])
    const list = (await res.json()) as unknown[]
    return Array.isArray(list) ? list.length : null
  } catch {
    return null
  }
}

export function SocialProofBar() {
  const [downloads, setDownloads] = useState<number | null>(null)
  const [stars, setStars] = useState<number | null>(null)
  const [contributors, setContributors] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(PACKAGES.map(fetchDownloads)).then(counts => {
      if (!cancelled) setDownloads(counts.reduce((a, b) => a + b, 0))
    })
    fetchStars().then(s => {
      if (!cancelled) setStars(s)
    })
    fetchContributorCount().then(c => {
      if (!cancelled) setContributors(c)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Live metrics show only once they carry a real, positive signal — a brand
  // new project should never advertise "0 monthly downloads". Static facts
  // (package count, core size, license) always render and stay single-sourced.
  const metrics: { label: string; value: string; href?: string }[] = []
  if (downloads && downloads > 0)
    metrics.push({ label: 'monthly downloads', value: compact(downloads), href: NPM_ORG })
  if (stars && stars > 0)
    metrics.push({ label: 'github stars', value: compact(stars), href: GITHUB_URL })
  if (contributors && contributors > 0)
    metrics.push({
      label: 'contributors',
      value: compact(contributors),
      href: `${GITHUB_URL}/graphs/contributors`,
    })
  metrics.push({ label: 'packages on npm', value: String(counts.packages), href: NPM_ORG })
  metrics.push({ label: 'integrations', value: String(counts.integrations) })
  metrics.push({ label: 'core size', value: '< 10 KB' })
  metrics.push({ label: 'license', value: 'MIT' })

  return (
    <section className="border-b border-ak-border bg-ak-surface/50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10 sm:gap-y-4">
        {metrics.map((m, i) => (
          <span key={m.label} className="flex items-center gap-x-6 sm:gap-x-10">
            <Metric href={m.href} label={m.label} value={m.value} />
            {i < metrics.length - 1 ? <Divider /> : null}
          </span>
        ))}
      </div>
    </section>
  )
}

function Divider() {
  return <span className="hidden h-6 w-px bg-ak-border md:inline-block" />
}

function Metric({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  const content = (
    <span className="flex items-baseline gap-2">
      <span className="font-mono text-xl font-semibold text-ak-foam">
        {value}
      </span>
      <span className="font-mono text-xs uppercase tracking-wider text-ak-graphite">
        {label}
      </span>
    </span>
  )
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="transition hover:opacity-80"
    >
      {content}
    </a>
  ) : (
    content
  )
}
