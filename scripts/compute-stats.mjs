#!/usr/bin/env node
/**
 * Canonical derivation of AgentsKit ecosystem counts from the real monorepo.
 *
 * This is THE single source for every "N packages / N adapters / ..." number on
 * agentskit.io. The derivation rules below ARE the definition of each count —
 * change a rule here, never a number in a page. Plain JS so it runs without a
 * build step and can be copied verbatim into sibling repos.
 *
 * Consumed by scripts/gen-ecosystem-stats.mjs (writes the committed snapshots
 * both Next apps import) and by scripts/check-count-drift.mjs (the gate).
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const FRAMEWORK_BINDINGS = ['react', 'vue', 'svelte', 'solid', 'angular', 'ink', 'react-native']

const ADAPTER_NON_PROVIDERS = new Set([
  'generic', 'types', 'utils', 'util', 'router', 'carbon', 'ensemble',
  'fallback', 'mock', 'embedders', 'deprecation', 'credential-rotation', 'bail',
])

const MEMORY_NON_BACKENDS = new Set([
  'index', 'types', 'utils', 'util', 'contract', 'base',
  'forget', 'redaction', 'personalization', 'redis-client',
])

const SKILL_NON_SKILLS = ['index', 'compose', 'marketplace', 'types', 'registry']

function listDirs(p) {
  if (!existsSync(p)) return []
  return readdirSync(p).filter((n) => {
    try { return statSync(join(p, n)).isDirectory() } catch { return false }
  })
}

function listTs(p) {
  if (!existsSync(p)) return []
  return readdirSync(p)
    .filter((n) => n.endsWith('.ts') && !n.endsWith('.d.ts') && !n.includes('.test.'))
    .map((n) => n.replace(/\.ts$/, ''))
}

export function computeStats(root = REPO_ROOT) {
  const pkgRoot = join(root, 'packages')

  let packages = 0
  const published = new Set()
  const packageList = []
  for (const dir of listDirs(pkgRoot)) {
    const pj = join(pkgRoot, dir, 'package.json')
    if (!existsSync(pj)) continue
    try {
      const json = JSON.parse(readFileSync(pj, 'utf8'))
      if (json.name?.startsWith('@agentskit/') && !json.private) {
        packages++
        published.add(json.name.replace('@agentskit/', ''))
        packageList.push({
          name: json.name,
          description: json.description ?? '',
          stability: json.agentskit?.stability ?? 'unlisted',
        })
      }
    } catch { /* skip */ }
  }
  packageList.sort((a, b) => a.name.localeCompare(b.name))

  const frameworkBindings = FRAMEWORK_BINDINGS.filter((f) => published.has(f)).length

  let nativeAdapters = 0
  const adaptersIndex = join(pkgRoot, 'adapters', 'src', 'index.ts')
  if (existsSync(adaptersIndex)) {
    const src = readFileSync(adaptersIndex, 'utf8')
    const names = new Set()
    for (const m of src.matchAll(/from\s+['"]\.\/([a-z0-9-]+)['"]/g)) names.add(m[1])
    for (const n of names) if (!ADAPTER_NON_PROVIDERS.has(n)) nativeAdapters++
  }

  const integrationList = listDirs(join(pkgRoot, 'integrations', 'src', 'services'))
    .filter((n) => !n.startsWith('_'))
    .sort()
  const integrations = integrationList.length

  let catalogProviders = 0
  let catalogModels = 0
  let providerList = []
  const catalogSnap = join(pkgRoot, 'adapters', 'src', 'catalog', 'snapshot.json')
  if (existsSync(catalogSnap)) {
    try {
      const c = JSON.parse(readFileSync(catalogSnap, 'utf8'))
      const arr = Array.isArray(c.providers) ? c.providers : c.providers ? Object.values(c.providers) : []
      catalogProviders = arr.length
      providerList = arr.map((pr) => pr.id).filter(Boolean).sort()
      for (const pr of arr) {
        const m = pr.models
        if (Array.isArray(m)) catalogModels += m.length
        else if (m && typeof m === 'object') catalogModels += Object.keys(m).length
      }
    } catch { /* zero */ }
  }

  const skills = listTs(join(pkgRoot, 'skills', 'src'))
    .filter((n) => !SKILL_NON_SKILLS.includes(n)).length

  const memoryBackends = listTs(join(pkgRoot, 'memory', 'src'))
    .filter((n) => !MEMORY_NON_BACKENDS.has(n)).length

  const recipesDir = join(root, 'apps', 'docs-next', 'content', 'docs', 'reference', 'recipes')
  const recipes = existsSync(recipesDir)
    ? readdirSync(recipesDir).filter((n) => n.endsWith('.mdx') && !/^(index|meta)/.test(n)).length
    : 0

  let coreSizeKbGzip = 10
  const sizeLimit = join(root, '.size-limit.json')
  if (existsSync(sizeLimit)) {
    try {
      const arr = JSON.parse(readFileSync(sizeLimit, 'utf8'))
      const core = arr.find((x) => /core.*ESM/i.test(x.name ?? ''))
      const kb = core?.limit?.match(/([\d.]+)\s*KB/i)
      if (kb) coreSizeKbGzip = Number(kb[1])
    } catch { /* default */ }
  }

  return {
    schemaVersion: 1,
    property: 'agentskit',
    counts: {
      packages, frameworkBindings, nativeAdapters, integrations,
      catalogProviders, catalogModels, skills, memoryBackends, recipes,
    },
    lists: {
      packages: packageList,
      integrations: integrationList,
      providers: providerList,
    },
    coreSizeKbGzip,
  }
}
