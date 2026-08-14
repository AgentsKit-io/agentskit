#!/usr/bin/env node
/**
 * Read-only post-deploy check for canonical public surfaces.
 * This is intentionally not part of the offline quality gate: it depends on
 * the deployed sites and must never mutate or publish anything.
 */

const site = (process.env.SEMANTIC_SITE ?? 'https://www.agentskit.io').replace(/\/$/, '')
const registry = (process.env.SEMANTIC_REGISTRY ?? 'https://registry.agentskit.io').replace(/\/$/, '')
const diagnostics = []

async function fetchSurface(origin, path) {
  const url = `${origin}${path}`
  try {
    const response = await fetch(url, { redirect: 'follow' })
    const body = await response.text()
    if (!response.ok) diagnostics.push(`${url} returned HTTP ${response.status}`)
    return { url, body, status: response.status }
  } catch (error) {
    diagnostics.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`)
    return { url, body: '', status: 0 }
  }
}

const [home, docs, ecosystem, robots, sitemap, llms, registryHome, registryLlms] = await Promise.all([
  fetchSurface(site, '/'),
  fetchSurface(site, '/docs'),
  fetchSurface(site, '/ecosystem'),
  fetchSurface(site, '/robots.txt'),
  fetchSurface(site, '/sitemap.xml'),
  fetchSurface(site, '/llms.txt'),
  fetchSurface(registry, '/'),
  fetchSurface(registry, '/llms.txt'),
])

function canonicalFor(body) {
  return body.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ?? null
}

const expectedCanonicals = [
  [home, site],
  [docs, `${site}/docs`],
  [ecosystem, `${site}/ecosystem`],
]
for (const [surface, expected] of expectedCanonicals) {
  const actual = canonicalFor(surface.body)
  if (actual !== expected) diagnostics.push(`${surface.url} canonical is ${actual ?? 'missing'}, expected ${expected}`)
}
if (!robots.body.includes(`Sitemap: ${site}/sitemap.xml`)) {
  diagnostics.push('root robots.txt does not point to the root sitemap')
}
if (!sitemap.body.includes(`${site}/docs`) || !sitemap.body.includes(`${site}/ecosystem`)) {
  diagnostics.push('root sitemap does not include the canonical docs and ecosystem hubs')
}

const staleTerms = /AgentsKit OS|production OS/
for (const surface of [home, ecosystem, llms, registryLlms]) {
  if (staleTerms.test(surface.body)) diagnostics.push(`${surface.url} still exposes a retired AKOS label`)
}
if (!llms.body.includes('optional')) diagnostics.push(`${llms.url} does not state the optional managed boundary`)

if (diagnostics.length > 0) {
  console.error(`live semantic authority check failed:\n${diagnostics.map((item) => `- ${item}`).join('\n')}`)
  process.exit(1)
}

console.log(`live semantic authority check passed: ${site} and ${registry}`)
