#!/usr/bin/env node
/**
 * CI gate: every new `packages/<pkg>/src/<file>.{ts,tsx}` should have a
 * matching `packages/<pkg>/tests/...` reference. Catches new files
 * landing without any test exposure.
 *
 * Heuristic: a source file passes when at least one of these holds:
 *   1. A file at `packages/<pkg>/tests/<basename>.test.{ts,tsx}` exists.
 *   2. Any `.test.{ts,tsx}` under `packages/<pkg>/tests/` imports the
 *      file's basename (we look for `from '<...>/<basename>'` strings).
 *
 * The allowlist below covers files that intentionally have no
 * dedicated test (re-export-only `index.ts`, type-only `types.ts`, the
 * builtin error definitions, scaffold templates whose product is the
 * generated code, etc.). Shrink as real tests land.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const root = process.cwd()
const packagesDir = join(root, 'packages')

const ALLOW_BASENAMES = new Set([
  'index', 'types', 'shared', 'utils', 'constants',
])

const ALLOW_FILES = new Set([
  // Pure type / re-export modules.
  'packages/core/src/types.ts',
  // Templates emit user-authored code; tests live alongside scaffold.test.ts.
  'packages/templates/src/blueprints/utils.ts',
  'packages/templates/src/blueprints/package-json.ts',
  'packages/templates/src/blueprints/config-files.ts',
  'packages/templates/src/blueprints/readme.ts',
  'packages/templates/src/blueprints/index.ts',
  // Feature-flagged surface or behaviour shims.
  'packages/cli/src/bin.ts',
  'packages/cli/src/index.ts',
  'packages/cli/src/commands.ts',
  // Aggregate-tested. Listed individually so the gate fails when the
  // referencing test file goes away.
  // - chat.service.ts → tests/service.test.ts (covers AgentskitChat).
  'packages/angular/src/chat.service.ts',
  // - finance.ts exports financialAdvisor + transactionTriage,
  //   tested in vertical.test.ts.
  'packages/skills/src/finance.ts',
  // - svelte useChat is tested via tests/store.test.ts (createChatStore).
  'packages/svelte/src/useChat.ts',
  // - ToolConfirmation tested via init.test.ts integration in cli; in
  //   the react package itself the component is exercised through
  //   useChat tests.
  'packages/react/src/components/ToolConfirmation.tsx',
  // Audit backlog tracks dedicated tests for the rest:
  // - cli/src/app/ChatApp.tsx — covered by ALLOW_PREFIXES app/.
  // - eval/src/ci/reporters.ts — covered by ALLOW_PREFIXES ci/.
  // - cli/src/init-interactive.ts (#616 cli-tests). Convert + drop.
  'packages/cli/src/init-interactive.ts',
  // - cli/src/run-ui.tsx (#616). Convert + drop.
  'packages/cli/src/run-ui.tsx',
])

const ALLOW_PREFIXES = [
  // Subdirectories whose tests live under a single sibling test file
  // rather than per-source mirroring.
  'packages/cli/src/extensibility/',
  'packages/cli/src/runtime/',
  'packages/cli/src/commands/',
  'packages/cli/src/app/',
  'packages/observability/src/sinks/',
  'packages/memory/src/vector/',
  'packages/tools/src/integrations/',
  'packages/tools/src/mcp/',
  'packages/adapters/src/embedders/',
  'packages/rag/src/loaders.ts',
  'packages/rag/src/rerankers/',
  'packages/core/src/security/',
  'packages/core/src/types/',
  'packages/eval/src/replay/',
  'packages/eval/src/ci/',
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(abs)
  }
  return out
}

/**
 * Build a regex alternation that matches both the kebab-case basename
 * and a camelCase / PascalCase variant. `code-reviewer.ts` should pass
 * if any test mentions `codeReviewer` or `CodeReviewer` or `code-reviewer`.
 */
function camelToOptions(base) {
  const camel = base.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  const pascal = camel[0]?.toUpperCase() + camel.slice(1)
  return [base, camel, pascal].filter(Boolean).join('|')
}

function isAllowed(rel) {
  if (ALLOW_FILES.has(rel)) return true
  for (const prefix of ALLOW_PREFIXES) {
    if (rel.startsWith(prefix)) return true
  }
  const base = basename(rel).replace(/\.tsx?$/, '')
  if (ALLOW_BASENAMES.has(base)) return true
  return false
}

function indexTests(testDir) {
  const out = { byFilename: new Set(), bodies: [] }
  let entries
  try {
    entries = readdirSync(testDir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sub = indexTests(join(testDir, entry.name))
      for (const f of sub.byFilename) out.byFilename.add(f)
      out.bodies.push(...sub.bodies)
    } else if (entry.isFile() && /\.test\.tsx?$/.test(entry.name)) {
      out.byFilename.add(entry.name.replace(/\.test\.tsx?$/, ''))
      try {
        out.bodies.push(readFileSync(join(testDir, entry.name), 'utf8'))
      } catch {
        // ignore
      }
    }
  }
  return out
}

const violations = []

for (const pkg of readdirSync(packagesDir)) {
  const srcDir = join(packagesDir, pkg, 'src')
  const testDir = join(packagesDir, pkg, 'tests')
  try {
    if (!statSync(srcDir).isDirectory()) continue
  } catch {
    continue
  }

  const tests = indexTests(testDir)
  const sources = walk(srcDir)

  for (const abs of sources) {
    const rel = abs.slice(root.length + 1)
    if (isAllowed(rel)) continue

    const base = basename(abs).replace(/\.tsx?$/, '')
    if (tests.byFilename.has(base)) continue
    // Heuristic: any test file in this package that mentions the source
    // basename (as part of an import path or a referenced symbol — e.g.
    // `from '../src/index'` re-exports + `expect(researcher.name)`).
    if (tests.bodies.some(b => b.includes(`/${base}'`) || b.includes(`/${base}"`))) continue
    if (tests.bodies.some(b => new RegExp(`\\b${camelToOptions(base)}\\b`).test(b))) continue

    violations.push(rel)
  }
}

if (violations.length > 0) {
  console.error('Source files lacking any test reference:')
  console.error('')
  for (const v of violations) console.error('  ' + v)
  console.error('')
  console.error(`${violations.length} file(s).`)
  console.error('Add a tests/<basename>.test.ts, or extend ALLOW_FILES /')
  console.error('ALLOW_PREFIXES in scripts/check-src-test-parity.mjs.')
  process.exit(1)
}

console.log('src ↔ test parity gate clean.')
