import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LEGACY_404_REDIRECTS } from '../legacy-404-redirects.mjs'

type LegacyRedirect = {
  source: string
  destination: string
  permanent: boolean
}

const redirects = LEGACY_404_REDIRECTS as LegacyRedirect[]

function docRoutes(): Set<string> {
  const root = resolve(__dirname, '../content/docs')
  const routes = new Set(['/docs'])

  function walk(directory: string): void {
    for (const name of readdirSync(directory)) {
      const path = resolve(directory, name)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      if (!/\.(md|mdx)$/.test(name)) continue

      const relative = path
        .slice(root.length + 1)
        .replaceAll('\\', '/')
        .replace(/\.(md|mdx)$/, '')
      routes.add(relative.endsWith('/index') ? `/docs/${relative.slice(0, -6)}` : `/docs/${relative}`)
    }
  }

  walk(root)
  return routes
}

describe('legacy 404 redirects', () => {
  it('keeps the importable queue unique, permanent, and one-hop', () => {
    const sources = redirects.map((redirect) => redirect.source)
    const sourceSet = new Set(sources)

    expect(sources.length).toBe(203)
    expect(sourceSet.size).toBe(sources.length)
    expect(redirects.every((redirect) => redirect.permanent)).toBe(true)
    expect(redirects.every((redirect) => !sourceSet.has(redirect.destination))).toBe(true)
  })

  it('keeps every queued destination backed by a current docs route', () => {
    const routes = docRoutes()
    const missing = redirects
      .map((redirect) => redirect.destination)
      .filter((destination) => !routes.has(destination))

    expect(missing).toEqual([])
  })
})
