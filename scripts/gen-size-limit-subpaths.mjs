#!/usr/bin/env node

import { gzipSync } from 'node:zlib'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const configPath = join(root, '.size-limit.json')
const cacheRoot = join(root, 'node_modules/.cache/size-limit-subpaths')
const update = process.argv.includes('--update')
const buildTargets = process.argv.includes('--build')
const check = process.argv.includes('--check')
const config = JSON.parse(readFileSync(configPath, 'utf8'))
const packages = readdirSync(join(root, 'packages'), { withFileTypes: true })
const entries = []
const skipped = []
const errors = []

function selectImport(value) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return null
  if (typeof value.import === 'string' || (value.import && typeof value.import === 'object')) {
    return selectImport(value.import)
  }
  if (typeof value.default === 'string' || (value.default && typeof value.default === 'object')) {
    return selectImport(value.default)
  }
  return null
}

function exportFile(value) {
  const selected = selectImport(value)
  return selected && /\.(?:m?js)$/.test(selected) ? selected : null
}

function exportId(key) {
  return key === '.' ? 'root' : key.slice(2).replaceAll('/', '__')
}

function targetName(packageName, key) {
  return `${packageName} (ESM export ${key})`
}

function sizeLimit(bytes) {
  // 10% headroom, rounded up to the next 0.5 kB; limits use decimal kB.
  const limitBytes = Math.max(500, Math.ceil((bytes * 1.1) / 500) * 500)
  return `${(limitBytes / 1000).toFixed(1).replace(/\.0$/, '')} KB`
}

for (const directory of packages) {
  if (!directory.isDirectory()) continue
  const packageDir = join(root, 'packages', directory.name)
  const manifestPath = join(packageDir, 'package.json')
  if (!existsSync(manifestPath)) continue
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.private || !manifest.exports) continue
  const buildConfigPath = join(packageDir, 'tsup.config.ts')
  const buildConfig = existsSync(buildConfigPath) ? readFileSync(buildConfigPath, 'utf8') : ''
  const configuredExternals = [...buildConfig.matchAll(/external\s*:\s*\[([\s\S]*?)\]/g)]
    .flatMap(([, list]) => [...list.matchAll(/['"]([^'"]+)['"]/g)].map(([, name]) => name))

  for (const [key, value] of Object.entries(manifest.exports)) {
    const file = exportFile(value)
    if (!file) {
      skipped.push({ package: manifest.name, subpath: key, reason: 'no ESM JavaScript export (for example, a CSS asset)' })
      continue
    }
    const input = resolve(packageDir, file)
    const output = join(cacheRoot, directory.name, `${exportId(key)}.js`)
    const name = targetName(manifest.name, key)
    entries.push({ package: manifest.name, directory: directory.name, subpath: key, input, output, name, manifest, configuredExternals })
  }
}

const generated = new Map(config.map((target) => [target.name, target]))
const missing = entries.filter((entry) => !generated.has(entry.name))

if (check && missing.length) {
  console.error('Missing size-limit targets for public ESM exports:')
  for (const entry of missing) console.error(`- ${entry.package} ${entry.subpath}`)
  process.exitCode = 1
} else if (check) {
  console.log(`✓ ${entries.length} public ESM exports have size-limit targets (${skipped.length} non-JS export skipped)`)
}

if (update || buildTargets) {
  const targetsToBuild = entries.filter((entry) => update || generated.has(entry.name))
  for (const entry of targetsToBuild) {
    if (!existsSync(entry.input)) {
      errors.push(`${entry.package} ${entry.subpath}: missing built ESM entry ${relative(root, entry.input)}`)
      continue
    }
    mkdirSync(dirname(entry.output), { recursive: true })
    const external = new Set([
      ...Object.keys(entry.manifest.dependencies ?? {}),
      ...Object.keys(entry.manifest.optionalDependencies ?? {}),
      ...Object.keys(entry.manifest.peerDependencies ?? {}),
      ...entry.configuredExternals,
    ])
    try {
      if (entry.package === '@agentskit/svelte') {
        // Svelte's published .svelte components are compiled by the consumer's
        // Svelte-aware bundler, so esbuild cannot flatten this ESM entry.
        copyFileSync(entry.input, entry.output)
      } else {
        await build({
          entryPoints: [entry.input],
          outfile: entry.output,
          bundle: true,
          format: 'esm',
          platform: 'node',
          external: [...external],
          treeShaking: true,
          legalComments: 'none',
          logLevel: 'silent',
        })
      }
      const gzipBytes = gzipSync(readFileSync(entry.output), { level: 9 }).length
      entry.gzipBytes = gzipBytes
      entry.limit = sizeLimit(gzipBytes)
    } catch (error) {
      errors.push(`${entry.package} ${entry.subpath}: ${error.message}`)
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exitCode = 1
}

if (update && !errors.length) {
  const additions = entries
    .filter((entry) => !generated.has(entry.name))
    .map((entry) => ({
      name: entry.name,
      path: relative(root, entry.output),
      limit: entry.limit,
      gzip: true,
    }))
  writeFileSync(configPath, `${JSON.stringify([...config, ...additions], null, 2)}\n`)
  console.log(`Added ${additions.length} size-limit targets; existing limits were preserved.`)
}

if ((update || buildTargets) && !errors.length) {
  console.log('\n| Package | Subpath | Gzip | Limit |')
  console.log('| --- | --- | ---: | ---: |')
  for (const entry of entries) {
    if (entry.gzipBytes === undefined) {
      const prior = generated.get(entry.name)
      if (prior) console.log(`| ${entry.package} | ${entry.subpath} | existing target | ${prior.limit} |`)
      continue
    }
    console.log(`| ${entry.package} | ${entry.subpath} | ${(entry.gzipBytes / 1000).toFixed(2)} kB | ${entry.limit} |`)
  }
  for (const item of skipped) console.log(`\nSkipped ${item.package} ${item.subpath}: ${item.reason}.`)
}
