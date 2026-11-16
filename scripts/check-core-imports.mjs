#!/usr/bin/env node
// Enforce the core import boundary of the interoperability charter
// (docs/architecture/adrs/0045-interoperability-charter.md, sections 1 and 6).
//
//  1. `packages/core/src` (tests excluded) may import only: relative paths,
//     `json-schema` as `import type`, `canonicalize` and `@noble/hashes`.
//     Static, dynamic `import()`, `require()` and `export ... from` count.
//  2. `dependencies`/`peerDependencies` of `packages/*`: core has no
//     `@agentskit/*`, and the package graph has no cycle.
//
// Usage: node scripts/check-core-imports.mjs [repoRoot]

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ALLOWED_PACKAGES = ['canonicalize', '@noble/hashes']
const TYPE_ONLY_PACKAGES = ['json-schema']

const isTestFile = name => /\.(test|spec)\.[cm]?[tj]sx?$/.test(name)

function listSources(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue
      out.push(...listSources(full))
    } else if (/\.[cm]?[tj]sx?$/.test(entry) && !/\.d\.ts$/.test(entry) && !isTestFile(entry)) {
      out.push(full)
    }
  }
  return out
}

/** Blank out comments (keeping newlines) so quoted text in docs is not scanned. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length))
}

/** Returns [{ specifier, typeOnly, line }] for every module specifier in `text`. */
export function findImports(text) {
  const code = stripComments(text)
  const found = []
  const patterns = [
    // import type X from 'a' / import X from 'a' / export type {..} from 'a' / export * from 'a'
    { re: /(?:^|[;}])\s*(import|export)\s+(type\s+)?(?:[\w$*{][^'"`;]*?\s+from\s+)['"]([^'"]+)['"]/gm, spec: 3, type: 2 },
    // (static forms are anchored to a statement start so generated code in template strings is ignored)
    // side-effect import 'a'
    { re: /(?:^|[;}])\s*import\s*['"]([^'"]+)['"]/gm, spec: 1 },
    // import('a') and require('a')
    { re: /\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g, spec: 1 },
  ]
  for (const { re, spec, type } of patterns) {
    for (const m of code.matchAll(re)) {
      const line = (code.slice(0, m.index + m[0].match(/^[;}]?\s*/)[0].length).match(/\n/g) ?? []).length + 1
      found.push({ specifier: m[spec], typeOnly: Boolean(type && m[type]), line })
    }
  }
  return found
}

const packageOf = spec => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])

export function checkCoreImports(root) {
  const errors = []
  const srcDir = join(root, 'packages', 'core', 'src')
  if (!existsSync(srcDir)) return [`missing ${srcDir}`]
  for (const file of listSources(srcDir)) {
    const rel = relative(root, file)
    for (const { specifier, typeOnly, line } of findImports(readFileSync(file, 'utf8'))) {
      if (specifier.startsWith('.')) continue
      const pkg = packageOf(specifier)
      if (ALLOWED_PACKAGES.includes(pkg)) continue
      if (TYPE_ONLY_PACKAGES.includes(pkg)) {
        if (!typeOnly) errors.push(`${rel}:${line}: '${specifier}' must be imported with \`import type\``)
        continue
      }
      errors.push(`${rel}:${line}: import of '${specifier}' is outside the core allowlist (ADR 0045 §6)`)
    }
  }
  return errors
}

export function checkDirection(root) {
  const errors = []
  const pkgsDir = join(root, 'packages')
  const graph = new Map()
  for (const dir of readdirSync(pkgsDir)) {
    const file = join(pkgsDir, dir, 'package.json')
    if (!existsSync(file)) continue
    const pkg = JSON.parse(readFileSync(file, 'utf8'))
    const edges = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})].filter(n =>
      n.startsWith('@agentskit/'),
    )
    graph.set(pkg.name, { edges, file: relative(root, file) })
  }
  const core = graph.get('@agentskit/core')
  if (core && core.edges.length > 0) {
    errors.push(`${core.file}: core must not depend on @agentskit/* (found ${core.edges.join(', ')})`)
  }
  const state = new Map()
  const stack = []
  const visit = name => {
    if (state.get(name) === 2) return
    if (state.get(name) === 1) {
      errors.push(`dependency cycle: ${[...stack.slice(stack.indexOf(name)), name].join(' -> ')}`)
      return
    }
    state.set(name, 1)
    stack.push(name)
    for (const next of graph.get(name)?.edges ?? []) if (graph.has(next)) visit(next)
    stack.pop()
    state.set(name, 2)
  }
  for (const name of graph.keys()) visit(name)
  return errors
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? process.cwd())
  const errors = [...checkCoreImports(root), ...checkDirection(root)]
  if (errors.length > 0) {
    console.error(`\ncore import boundary violated:\n${errors.map(e => `  ${e}`).join('\n')}\n`)
    process.exit(1)
  }
  console.log('core import boundary and dependency direction ✓')
}
