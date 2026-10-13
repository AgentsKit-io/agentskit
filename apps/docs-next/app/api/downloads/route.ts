import { NextResponse } from 'next/server'
import { readJson } from '@agentskit/net'
import {
  FIRST_PUBLISHED_DAY, PACKAGE_NAMES, dateChunks,
  type DailyCount, type DownloadsData, type PackageCounts, type PackageName,
} from '@/lib/npm-downloads'

const API = 'https://api.npmjs.org/downloads'

async function npmJson(url: string): Promise<unknown> {
  const response = await fetch(url, { next: { revalidate: 3600 } })
  if (!response.ok) throw new Error(`npm downloads API returned ${response.status}`)
  return readJson(response, { maxBytes: 64_000 })
}

function isDailyCount(value: unknown): value is DailyCount {
  return typeof value === 'object' && value !== null &&
    'day' in value && typeof value.day === 'string' &&
    'downloads' in value && typeof value.downloads === 'number' &&
    Number.isFinite(value.downloads) && value.downloads >= 0
}

async function getPackage(name: PackageName, through: string): Promise<PackageCounts> {
  const downloads: DailyCount[] = []
  const seen = new Set<string>()
  for (const chunk of dateChunks(FIRST_PUBLISHED_DAY, through)) {
    const url = `${API}/range/${chunk.start}:${chunk.end}/${name}`
    const response = await fetch(url, { next: { revalidate: 3600 } })
    if (response.status === 404) {
      // npm has no download series until the first completed day after publication.
      const registry = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
        next: { revalidate: 86400 },
      })
      if (!registry.ok) throw new Error(`npm registry returned ${registry.status} for ${name}`)
      const metadata: unknown = await readJson(registry, { maxBytes: 4_000_000 })
      const created = typeof metadata === 'object' && metadata !== null && 'time' in metadata &&
        typeof metadata.time === 'object' && metadata.time !== null && 'created' in metadata.time
        ? metadata.time.created : null
      if (typeof created === 'string' && created.slice(0, 10) > chunk.end) {
        if (created.slice(0, 10) > through) return { name, downloads: [], pending: true }
        continue
      }
      throw new Error(`npm has no download data for ${name}`)
    }
    if (!response.ok) throw new Error(`npm downloads API returned ${response.status} for ${name}`)
    const payload: unknown = await readJson(response, { maxBytes: 1_000_000 })
    if (typeof payload !== 'object' || payload === null || !('package' in payload) || payload.package !== name || !('downloads' in payload) ||
        !Array.isArray(payload.downloads) || !payload.downloads.every(isDailyCount)) {
      throw new Error(`Unexpected npm download data for ${name}`)
    }
    for (const entry of payload.downloads) {
      if (entry.day < chunk.start || entry.day > chunk.end || seen.has(entry.day)) {
        throw new Error(`Overlapping npm download data for ${name}`)
      }
      seen.add(entry.day)
      downloads.push(entry)
    }
  }
  return { name, downloads, pending: false }
}

export async function GET() {
  try {
    const latest: unknown = await npmJson(`${API}/point/last-day`)
    if (typeof latest !== 'object' || latest === null || !('end' in latest) ||
        typeof latest.end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(latest.end)) {
      throw new Error('Unexpected npm latest-day response')
    }
    const through = latest.end
    const names = PACKAGE_NAMES.map((name) => `@agentskit/${name}` as PackageName)
    const packages: PackageCounts[] = new Array(names.length)
    let next = 0
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (next < names.length) {
        const index = next++
        packages[index] = await getPackage(names[index], through)
      }
    }))
    const data: DownloadsData = { since: FIRST_PUBLISHED_DAY, through, packages }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' } })
  } catch (error) {
    console.error('Unable to load npm downloads:', error)
    return NextResponse.json({ error: 'npm download data is temporarily unavailable. Please retry.' }, { status: 502 })
  }
}
