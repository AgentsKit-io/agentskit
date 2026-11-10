'use client'

import { useEffect, useMemo, useState } from 'react'
import { readJson } from '@agentskit/net'
import {
  PACKAGE_NAMES, addDays, sumDays,
  type DailyCount, type DownloadsData, type PackageName,
} from '@/lib/npm-downloads'

type Period = '7d' | '30d' | '90d' | '1y' | 'custom'
type Granularity = 'daily' | 'weekly' | 'monthly'

const periods: { key: Period; label: string; days: number }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '1y', label: '1 year', days: 365 },
]
const number = new Intl.NumberFormat('en-US')
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })

function displayDate(day: string, full = false): string {
  return (full ? fullDate : shortDate).format(new Date(`${day}T00:00:00Z`))
}

function bucket(day: string, granularity: Granularity): string {
  if (granularity === 'monthly') return day.slice(0, 7)
  if (granularity === 'weekly') {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
    return addDays(day, -((weekday + 6) % 7))
  }
  return day
}

function chartData(days: DailyCount[], granularity: Granularity): DailyCount[] {
  const grouped = new Map<string, number>()
  for (const entry of days) {
    const key = bucket(entry.day, granularity)
    grouped.set(key, (grouped.get(key) ?? 0) + entry.downloads)
  }
  return [...grouped].map(([day, downloads]) => ({ day, downloads }))
}

function Trend({ days, granularity }: { days: DailyCount[]; granularity: Granularity }) {
  const points = chartData(days, granularity)
  const max = Math.max(1, ...points.map((point) => point.downloads))
  const plotted = points.map((point, index) => {
    const x = points.length === 1 ? 500 : 48 + (index / (points.length - 1)) * 904
    const y = 242 - (point.downloads / max) * 200
    return { ...point, x, y }
  })
  const line = plotted.map(({ x, y }) => `${x},${y}`).join(' ')
  return (
    <div className="overflow-hidden rounded-lg border border-ak-border bg-ak-surface p-4 sm:p-6">
      <svg viewBox="0 0 1000 290" role="img" aria-label={`Download trend with ${points.length} ${granularity} values`} className="w-full">
        <title>Downloads over time</title>
        <desc>{points.map((point) => `${displayDate(point.day)}: ${number.format(point.downloads)}`).join('; ')}</desc>
        {[42, 142, 242].map((y) => <line key={y} x1="48" x2="952" y1={y} y2={y} stroke="var(--ak-border)" />)}
        <text x="48" y="30" fill="var(--ak-muted)" fontSize="14">{number.format(max)}</text>
        <text x="48" y="266" fill="var(--ak-muted)" fontSize="14">0</text>
        {points.length > 1 && <polyline fill="none" stroke="var(--ak-blue)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={line} />}
        {plotted.map(({ day, downloads, x, y }) => (
          <circle key={day} cx={x} cy={y} r={points.length <= 31 ? 3.5 : 1.5} fill="var(--ak-blue)">
            <title>{displayDate(day)}: {number.format(downloads)}</title>
          </circle>
        ))}
        {points.length > 0 && <>
          <text x="48" y="286" fill="var(--ak-muted)" fontSize="14">{displayDate(days[0].day)}</text>
          <text x="952" y="286" textAnchor="end" fill="var(--ak-muted)" fontSize="14">{displayDate(days[days.length - 1].day)}</text>
        </>}
      </svg>
    </div>
  )
}

export function DownloadsDashboard() {
  const [data, setData] = useState<DownloadsData | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [period, setPeriod] = useState<Period>('30d')
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [selected, setSelected] = useState<Set<PackageName>>(() => new Set(PACKAGE_NAMES.map((name) => `@agentskit/${name}` as PackageName)))
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/downloads', { signal: controller.signal })
      .then(async (response) => {
        const body = await readJson<{ error?: string } & DownloadsData>(response, { maxBytes: 4_000_000 })
        if (!response.ok) throw new Error(body.error ?? 'Unable to load npm downloads.')
        setData(body as DownloadsData)
        setError('')
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load npm downloads.')
      })
    return () => controller.abort()
  }, [retry])

  const through = data?.through ?? ''
  const since = data?.since ?? ''
  const preset = periods.find((item) => item.key === period)
  const presetStart = through && preset ? addDays(through, 1 - preset.days) : ''
  const start = period === 'custom' ? customStart : presetStart < since ? since : presetStart
  const end = period === 'custom' ? customEnd : through
  const validRange = !!data && !!start && !!end && start >= since && end <= through && start <= end
  const selectedPackages = useMemo(() => data?.packages.filter((pkg) => selected.has(pkg.name)) ?? [], [data, selected])
  const lifetime = selectedPackages.reduce((sum, pkg) => sum + sumDays(pkg.downloads, since, through), 0)
  const periodTotal = validRange ? selectedPackages.reduce((sum, pkg) => sum + sumDays(pkg.downloads, start, end), 0) : 0
  const ranking = validRange ? selectedPackages.map((pkg) => ({
    ...pkg,
    periodTotal: sumDays(pkg.downloads, start, end),
    lifetimeTotal: sumDays(pkg.downloads, since, through),
  })).sort((a, b) => b.periodTotal - a.periodTotal || a.name.localeCompare(b.name)) : []
  const daily = useMemo(() => {
    if (!validRange) return []
    const totals = new Map<string, number>()
    for (const pkg of selectedPackages) for (const entry of pkg.downloads) {
      if (entry.day >= start && entry.day <= end) totals.set(entry.day, (totals.get(entry.day) ?? 0) + entry.downloads)
    }
    const result: DailyCount[] = []
    for (let day = start; day <= end; day = addDays(day, 1)) result.push({ day, downloads: totals.get(day) ?? 0 })
    return result
  }, [selectedPackages, start, end, validRange])

  function choosePeriod(value: Period) {
    if (value === 'custom' && data && !customStart) {
      setCustomStart(addDays(data.through, -29) < data.since ? data.since : addDays(data.through, -29))
      setCustomEnd(data.through)
    }
    setPeriod(value)
    setGranularity(value === '1y' ? 'monthly' : value === '90d' ? 'weekly' : 'daily')
  }

  function toggle(name: PackageName) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <p className="font-mono text-sm text-ak-blue">/downloads</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ak-foam sm:text-5xl">npm downloads</h1>
        <p className="mt-4 text-lg leading-relaxed text-ak-graphite">Public download activity across the {PACKAGE_NAMES.length} packages in the <code className="text-ak-foam">@agentskit</code> scope. Counts come from npm and include dependency installs; they do not represent unique users.</p>
      </header>

      {!data && !error && <div role="status" className="mt-12 rounded-lg border border-ak-border bg-ak-surface p-6 text-ak-graphite">Loading download history from npm…</div>}
      {error && <div role="alert" className="mt-12 rounded-lg border border-ak-red bg-ak-surface p-6">
        <p className="text-ak-foam">{error}</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-4 min-h-11 rounded-md border border-ak-border px-4 text-ak-foam hover:border-ak-blue focus-visible:outline-2 focus-visible:outline-ak-blue">Retry</button>
      </div>}

      {data && <>
        <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ak-graphite">
          <span>Source: <a className="text-ak-blue underline underline-offset-4" href="https://github.com/npm/registry/blob/main/docs/download-counts.md" target="_blank" rel="noreferrer">npm downloads API</a></span>
          <span>Complete through {displayDate(data.through, true)} UTC</span>
          <span>{data.packages.length} packages</span>
        </div>

        <section aria-labelledby="filters-title" className="mt-10 border-t border-ak-border pt-7">
          <h2 id="filters-title" className="font-mono text-xs uppercase tracking-[0.16em] text-ak-graphite">Filters</h2>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Period">
            {periods.map((item) => <button key={item.key} type="button" aria-pressed={period === item.key} onClick={() => choosePeriod(item.key)} className={`min-h-11 rounded-md border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ak-blue ${period === item.key ? 'border-ak-blue bg-ak-blue text-ak-midnight' : 'border-ak-border text-ak-foam hover:border-ak-blue'}`}>{item.label}</button>)}
            <button type="button" aria-pressed={period === 'custom'} onClick={() => choosePeriod('custom')} className={`min-h-11 rounded-md border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ak-blue ${period === 'custom' ? 'border-ak-blue bg-ak-blue text-ak-midnight' : 'border-ak-border text-ak-foam hover:border-ak-blue'}`}>Custom</button>
          </div>
          {period === 'custom' && <div className="mt-4 flex flex-wrap gap-4">
            <label className="text-sm text-ak-graphite">From<input type="date" min={since} max={through} value={customStart} onInput={(event) => setCustomStart(event.currentTarget.value)} onChange={(event) => setCustomStart(event.target.value)} className="mt-1 block min-h-11 rounded-md border border-ak-border bg-ak-surface px-3 text-ak-foam focus-visible:outline-2 focus-visible:outline-ak-blue" /></label>
            <label className="text-sm text-ak-graphite">To<input type="date" min={since} max={through} value={customEnd} onInput={(event) => setCustomEnd(event.currentTarget.value)} onChange={(event) => setCustomEnd(event.target.value)} className="mt-1 block min-h-11 rounded-md border border-ak-border bg-ak-surface px-3 text-ak-foam focus-visible:outline-2 focus-visible:outline-ak-blue" /></label>
          </div>}
          {!validRange && <p role="alert" className="mt-3 text-sm text-ak-red">Choose dates between {displayDate(since, true)} and {displayDate(through, true)}, with From before To.</p>}
          <details className="mt-6 rounded-lg border border-ak-border bg-ak-surface">
            <summary className="cursor-pointer px-4 py-3 font-medium text-ak-foam focus-visible:outline-2 focus-visible:outline-ak-blue">Packages · {selected.size} selected</summary>
            <div className="border-t border-ak-border p-4">
              <div className="flex gap-4">
                <button type="button" onClick={() => setSelected(new Set(PACKAGE_NAMES.map((name) => `@agentskit/${name}` as PackageName)))} className="min-h-11 text-sm text-ak-blue underline underline-offset-4">Select all</button>
                <button type="button" onClick={() => setSelected(new Set())} className="min-h-11 text-sm text-ak-blue underline underline-offset-4">Clear</button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.packages.map((pkg) => <label key={pkg.name} className="flex min-h-11 items-center gap-3 rounded-md px-2 font-mono text-sm text-ak-foam hover:bg-ak-midnight"><input type="checkbox" checked={selected.has(pkg.name)} onChange={() => toggle(pkg.name)} className="size-4 accent-ak-blue" />{pkg.name}</label>)}
              </div>
            </div>
          </details>
        </section>

        <section aria-labelledby="summary-title" className="mt-12">
          <h2 id="summary-title" className="font-mono text-xs uppercase tracking-[0.16em] text-ak-graphite">Selected packages</h2>
          <div aria-live="polite" className="mt-4 grid gap-6 border-y border-ak-border py-7 sm:grid-cols-2">
            <div><p className="text-sm text-ak-graphite">Downloads in period</p><p className="mt-2 font-display text-4xl font-semibold tabular-nums text-ak-foam sm:text-5xl">{validRange ? number.format(periodTotal) : '—'}</p><p className="mt-2 text-sm text-ak-graphite">{validRange ? `${displayDate(start, true)} – ${displayDate(end, true)}` : 'Choose a valid period'}</p></div>
            <div><p className="text-sm text-ak-graphite">Cumulative downloads</p><p className="mt-2 font-display text-4xl font-semibold tabular-nums text-ak-foam sm:text-5xl">{number.format(lifetime)}</p><p className="mt-2 text-sm text-ak-graphite">Since {displayDate(since, true)} · through {displayDate(through, true)}</p></div>
          </div>
          {selected.size === 0 && <p className="mt-4 text-sm text-ak-graphite">Select at least one package to see its downloads.</p>}
          {data.packages.some((pkg) => pkg.pending) && <p className="mt-4 text-sm text-ak-graphite">Newly published packages may have no completed day of npm download data yet.</p>}
        </section>

        {validRange && selected.size > 0 && <>
          <section aria-labelledby="trend-title" className="mt-14">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div><h2 id="trend-title" className="font-display text-2xl font-semibold text-ak-foam">Download trend</h2><p className="mt-1 text-sm text-ak-graphite">Daily counts summed across the selected packages.</p></div>
              <label className="text-sm text-ak-graphite">Group by<select value={granularity} onChange={(event) => setGranularity(event.target.value as Granularity)} className="ml-3 min-h-11 rounded-md border border-ak-border bg-ak-surface px-3 text-ak-foam focus-visible:outline-2 focus-visible:outline-ak-blue"><option value="daily">Day</option><option value="weekly">Week</option><option value="monthly">Month</option></select></label>
            </div>
            <Trend days={daily} granularity={granularity} />
            <p className="mt-2 text-xs text-ak-graphite">Weeks start Monday UTC. The first and last groups may be partial.</p>
          </section>

          <section aria-labelledby="ranking-title" className="mt-14">
            <h2 id="ranking-title" className="font-display text-2xl font-semibold text-ak-foam">Package ranking</h2>
            <p className="mt-2 text-sm text-ak-graphite">Each selected package appears once. Cumulative totals use the same npm daily data.</p>
            <div className="mt-5 overflow-x-auto rounded-lg border border-ak-border">
              <table className="w-full min-w-[530px] text-left text-sm">
                <thead className="bg-ak-surface text-xs uppercase tracking-wider text-ak-graphite"><tr><th scope="col" className="px-4 py-3">Rank</th><th scope="col" className="px-4 py-3">Package</th><th scope="col" className="px-4 py-3 text-right">Period</th><th scope="col" className="px-4 py-3 text-right">Cumulative</th></tr></thead>
                <tbody>{ranking.map((pkg, index) => <tr key={pkg.name} className="border-t border-ak-border text-ak-foam"><td className="px-4 py-3 text-ak-graphite">{index + 1}</td><td className="px-4 py-3 font-mono"><a href={`https://www.npmjs.com/package/${pkg.name}`} target="_blank" rel="noreferrer" className="hover:text-ak-blue hover:underline">{pkg.name}</a>{pkg.pending && <span className="ml-2 text-xs text-ak-graphite">awaiting first day</span>}</td><td className="px-4 py-3 text-right tabular-nums">{number.format(pkg.periodTotal)}</td><td className="px-4 py-3 text-right tabular-nums">{number.format(pkg.lifetimeTotal)}</td></tr>)}</tbody>
                <tfoot><tr className="border-t border-ak-border bg-ak-surface font-semibold text-ak-foam"><th colSpan={2} scope="row" className="px-4 py-3">Selected total</th><td className="px-4 py-3 text-right tabular-nums">{number.format(periodTotal)}</td><td className="px-4 py-3 text-right tabular-nums">{number.format(lifetime)}</td></tr></tfoot>
              </table>
            </div>
          </section>
        </>}
        <p className="mt-12 border-t border-ak-border pt-5 text-xs leading-6 text-ak-graphite">npm reports completed UTC days and may revise counts. This page requests each scoped package separately because npm bulk downloads queries do not support scoped packages. Historical requests are split into non-overlapping windows within npm’s 18-month limit. Filters reuse the loaded series without requesting or counting a package twice.</p>
      </>}
    </main>
  )
}
