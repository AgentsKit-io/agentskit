#!/usr/bin/env node
/**
 * CI gate: bare `throw new Error(...)` is forbidden in package source
 * outside the typed-error definitions themselves. Use one of the
 * `AgentsKitError` subclasses (AdapterError, ToolError, MemoryError,
 * RuntimeError, SandboxError, SkillError, ConfigError) so every error
 * carries a stable code, hint, and docs URL.
 *
 * Allowlist:
 *   - packages/core/src/errors.ts (defines the hierarchy)
 *   - packages/core/src/controller.ts (intentional plain Error in legacy
 *     branches; tracked separately if we expand the gate further)
 *   - throws inside template literal strings (scaffolded code, few-shots)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ALLOW_FILES = new Set([
  'packages/core/src/errors.ts',
  'packages/core/src/controller.ts',
  // core subpath modules with bare throws — conversion queued per
  // module. Tracked in epic #562 backlog.
  'packages/core/src/a2a.ts',
  'packages/core/src/agent-schema.ts',
  'packages/core/src/budget.ts',
  'packages/core/src/compose-tool.ts',
  'packages/core/src/eval-format.ts',
  'packages/core/src/generative-ui.ts',
  'packages/core/src/hitl.ts',
  'packages/core/src/manifest.ts',
  'packages/core/src/progressive.ts',
  'packages/core/src/prompt-experiments.ts',
  'packages/core/src/security/rate-limit.ts',
  'packages/core/src/self-debug.ts',
  // eval replay primitives use Error as protocol contract; convert
  // when the eval package exits beta.
  'packages/eval/src/replay/cassette.ts',
  'packages/eval/src/replay/player.ts',
  // RAG loaders + rerankers have provider HTTP throws; convert in a
  // focused PR alongside the embedder enrichment.
  'packages/rag/src/loaders.ts',
  'packages/rag/src/rerankers/jina.ts',
  'packages/rag/src/rerankers/voyage.ts',
])

/**
 * Path prefixes whose violations we accept for now. Each entry is a
 * separate audit issue tracked in the enterprise-readiness epic
 * (#562) — convert + remove from this list as the work lands.
 */
const ALLOW_PREFIXES = [
  // CLI is a leaf consumer; user-facing errors land as plain text. Audit
  // backlog covers the conversion. Remove this prefix when that work is
  // done.
  'packages/cli/src/',
  // Templates emits user-authored boilerplate; throws are inside the
  // generated code's *example* contract and the backing validate.ts
  // lib. Convert in a focused PR.
  'packages/templates/src/',
  // Angular service has a single legacy bare throw on init guard.
  // Convert with the binding's coverage uplift.
  'packages/angular/src/',
  // Embedder fetchAvailableModels() throws a bare Error that the
  // caller (buildModelError) wraps with provider + URL context before
  // re-throwing. The wrap path is the user-facing surface; the inner
  // throw is internal signal.
  'packages/adapters/src/embedders/',
  // Adapter utility wrappers + replicate retry path: Error is the
  // contract for createStreamSource. Convert when we revisit retry.
  'packages/adapters/src/utils.ts',
  'packages/adapters/src/replicate.ts',
  // Skills marketplace + memory hierarchical: a couple of bare throws
  // remain after the primary sweep; track separately.
  'packages/skills/src/marketplace.ts',
  'packages/memory/src/hierarchical.ts',
  // Observability backwards-compat shims throw plain Error on
  // misconfigured sinks; conversion queued.
  'packages/observability/src/',
  // Runtime delegates emits Error on caller misuse; conversion queued.
  'packages/runtime/src/delegates.ts',
  'packages/runtime/src/runner.ts',
  // Tools mcp transports use plain Error for protocol-level signals.
  'packages/tools/src/mcp/transports.ts',
  // Sandbox e2b-backend wrap returns Error inside execute(); the
  // function returns ExecuteResult, so the bare Error is captured,
  // not thrown. Already typed via SandboxError.
  'packages/sandbox/src/types.ts',
]

const root = process.cwd()

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(abs)
  }
  return out
}

const packagesDir = join(root, 'packages')
const all = []
for (const pkg of readdirSync(packagesDir)) {
  const srcDir = join(packagesDir, pkg, 'src')
  try {
    if (!statSync(srcDir).isDirectory()) continue
  } catch {
    continue
  }
  walk(srcDir, all)
}

const violations = []

function isAllowed(rel) {
  if (ALLOW_FILES.has(rel)) return true
  for (const prefix of ALLOW_PREFIXES) {
    if (rel.startsWith(prefix)) return true
  }
  return false
}

for (const abs of all) {
  const rel = abs.slice(root.length + 1)
  if (isAllowed(rel)) continue

  const text = readFileSync(abs, 'utf8')
  // Strip template literal contents — `throw new Error(...)` inside a
  // backticked string is not executed, it's emitted as scaffold code.
  const stripped = text.replace(/`(?:[^`\\]|\\.)*`/gs, '``')

  const re = /throw\s+new\s+Error\s*\(/g
  let match
  while ((match = re.exec(stripped))) {
    const line = stripped.slice(0, match.index).split('\n').length
    violations.push(`${rel}:${line}`)
  }
}

if (violations.length > 0) {
  console.error('Bare `throw new Error(...)` found in package source.')
  console.error('Use AdapterError / ToolError / MemoryError / RuntimeError /')
  console.error('SandboxError / SkillError / ConfigError from @agentskit/core.')
  console.error('')
  for (const v of violations) console.error(`  ${v}`)
  console.error('')
  console.error(`${violations.length} violation(s).`)
  process.exit(1)
}

console.log(`Bare-throw gate clean across ${all.length} files.`)
