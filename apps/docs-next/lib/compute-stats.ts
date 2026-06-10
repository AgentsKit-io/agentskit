/**
 * Build-time derivation of AgentsKit ecosystem counts from the real monorepo.
 *
 * This module is the CANONICAL source for every "N packages / N adapters / ..."
 * number on agentskit.io. Marketing copy must read these values (via the
 * generated snapshot), never hand-type them. The derivation rules below ARE the
 * definition of each count — change the rule here, not a number in a page.
 *
 * Server-only (uses `node:fs`). Imported by app/api/stats.json/route.ts and by
 * scripts/gen-stats-snapshot.mjs. Never imported into a client component.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

export interface EcosystemStats {
  schemaVersion: 1
  property: 'agentskit'
  counts: {
    packages: number
    frameworkBindings: number
    nativeAdapters: number
    integrations: number
    catalogProviders: number
    catalogModels: number
    skills: number
    memoryBackends: number
    recipes: number
  }
  coreSizeKbGzip: number
}

/** Walk up from cwd to the monorepo root (the dir holding pnpm-workspace.yaml). */
function findRepoRoot(): string {
  let dir = process.cwd()
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  // Fallback: docs-next sits at <root>/apps/docs-next
  return resolve(process.cwd(), '..', '..')
}

const FRAMEWORK_BINDINGS = ['react', 'vue', 'svelte', 'solid', 'angular', 'ink', 'react-native']

/** Helper/infra modules in adapters/src that are NOT provider adapters. */
const ADAPTER_NON_PROVIDERS = new Set([
  'generic', 'types', 'utils', 'util', 'router', 'carbon', 'ensemble',
  'fallback', 'mock', 'embedders', 'deprecation', 'credential-rotation', 'bail',
])

/** Helper/infra modules in memory/src that are NOT storage backends. */
const MEMORY_NON_BACKENDS = new Set([
  'index', 'types', 'utils', 'util', 'contract', 'base',
  'forget', 'redaction', 'personalization', 'redis-client',
])

function listDirs(p: string): string[] {
  if (!existsSync(p)) return []
  return readdirSync(p).filter((n) => {
    try { return statSync(join(p, n)).isDirectory() } catch { return false }
  })
}

function listTs(p: string): string[] {
  if (!existsSync(p)) return []
  return readdirSync(p)
    .filter((n) => n.endsWith('.ts') && !n.endsWith('.d.ts') && !n.includes('.test.'))
    .map((n) => n.replace(/\.ts$/, ''))
}

export function computeStats(): EcosystemStats {
  const root = findRepoRoot()
  const pkgRoot = join(root, 'packages')

  // packages: published @agentskit/* (name set, not private)
  let packages = 0
  const publishedNames = new Set<string>()
  for (const dir of listDirs(pkgRoot)) {
    const pj = join(pkgRoot, dir, 'package.json')
    if (!existsSync(pj)) continue
    try {
      const json = JSON.parse(readFileSync(pj, 'utf8')) as { name?: string; private?: boolean }
      if (json.name?.startsWith('@agentskit/') && !json.private) {
        packages++
        publishedNames.add(json.name.replace('@agentskit/', ''))
      }
    } catch { /* skip unparseable */ }
  }

  // frameworkBindings: known UI binding packages that are actually published
  const frameworkBindings = FRAMEWORK_BINDINGS.filter((f) => publishedNames.has(f)).length

  // nativeAdapters: `export ... from './name'` in adapters/src/index.ts, minus helpers
  let nativeAdapters = 0
  const adaptersIndex = join(pkgRoot, 'adapters', 'src', 'index.ts')
  if (existsSync(adaptersIndex)) {
    const src = readFileSync(adaptersIndex, 'utf8')
    const names = new Set<string>()
    for (const m of src.matchAll(/from\s+['"]\.\/([a-z0-9-]+)['"]/g)) names.add(m[1])
    for (const n of names) if (!ADAPTER_NON_PROVIDERS.has(n)) nativeAdapters++
  }

  // integrations: service dirs under integrations/src/services, minus _template
  const integrations = listDirs(join(pkgRoot, 'integrations', 'src', 'services'))
    .filter((n) => n !== '_template').length

  // catalog providers + models: from the committed models.dev snapshot
  let catalogProviders = 0
  let catalogModels = 0
  const catalogSnap = join(pkgRoot, 'adapters', 'src', 'catalog', 'snapshot.json')
  if (existsSync(catalogSnap)) {
    try {
      const c = JSON.parse(readFileSync(catalogSnap, 'utf8')) as { providers?: unknown }
      const arr = Array.isArray(c.providers)
        ? c.providers
        : c.providers ? Object.values(c.providers as object) : []
      catalogProviders = arr.length
      for (const pr of arr as Array<{ models?: unknown }>) {
        const m = pr.models
        if (Array.isArray(m)) catalogModels += m.length
        else if (m && typeof m === 'object') catalogModels += Object.keys(m).length
      }
    } catch { /* leave zero */ }
  }

  // skills: skills/src/*.ts minus infra (index, compose, marketplace)
  const skills = listTs(join(pkgRoot, 'skills', 'src'))
    .filter((n) => !['index', 'compose', 'marketplace', 'types', 'registry'].includes(n)).length

  // memoryBackends: memory/src/*.ts minus helper/feature modules
  const memoryBackends = listTs(join(pkgRoot, 'memory', 'src'))
    .filter((n) => !MEMORY_NON_BACKENDS.has(n)).length

  // recipes: docs recipe pages
  const recipesDir = join(process.cwd(), 'content', 'docs', 'reference', 'recipes')
  const recipes = existsSync(recipesDir)
    ? readdirSync(recipesDir).filter((n) => n.endsWith('.mdx') && !/^(index|meta)/.test(n)).length
    : 0

  // coreSizeKbGzip: parsed from .size-limit.json (the @agentskit/core ESM limit)
  let coreSizeKbGzip = 10
  const sizeLimit = join(root, '.size-limit.json')
  if (existsSync(sizeLimit)) {
    try {
      const arr = JSON.parse(readFileSync(sizeLimit, 'utf8')) as Array<{ name?: string; limit?: string }>
      const core = arr.find((x) => /core.*ESM/i.test(x.name ?? ''))
      const kb = core?.limit?.match(/([\d.]+)\s*KB/i)
      if (kb) coreSizeKbGzip = Number(kb[1])
    } catch { /* keep default */ }
  }

  return {
    schemaVersion: 1,
    property: 'agentskit',
    counts: {
      packages,
      frameworkBindings,
      nativeAdapters,
      integrations,
      catalogProviders,
      catalogModels,
      skills,
      memoryBackends,
      recipes,
    },
    coreSizeKbGzip,
  }
}
