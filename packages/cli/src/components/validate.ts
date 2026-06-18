/**
 * Component install validator (RFC-0006 install-flow step 5; D4/D5/D11/D12).
 *
 * Given a {@link ProjectScan} and a {@link RegistryComponent}, decide whether the
 * component can be installed into this project — BEFORE any file is written. It
 * resolves the port by `uiBinding`, then checks: framework-target support, peer
 * version ranges, runtime/embedding satisfiability, server-only env scope, TS/JS
 * compatibility, styling, and serverless rate-limit durability. Pure + deterministic;
 * returns structured issues (never throws) so the CLI can print them and a
 * `--dry-run`/`--yes` flow can branch on `ok`.
 */
import type { ComponentPort, MetaFramework, ProjectScan, RegistryComponent } from './types'

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  severity: ValidationSeverity
  code: string
  message: string
}

export interface ValidationResult {
  /** True when there are no `error`-severity issues. */
  ok: boolean
  /** The resolved port for the detected `uiBinding`, when one exists. */
  port?: ComponentPort
  issues: ValidationIssue[]
}

export interface ValidateInput {
  scan: ProjectScan
  component: RegistryComponent
  /** Installed dependency versions (name → version) from the project package.json. */
  installed?: Record<string, string>
}

/** Meta-frameworks with no Node server runtime (pure client / device). */
const NO_NODE_SERVER: ReadonlySet<MetaFramework> = new Set([
  'expo',
  'vite',
  'cra',
  'angular-spa',
  'none',
])

/** Meta-frameworks commonly deployed serverless (per-instance limiter is unsafe). */
const SERVERLESS_CAPABLE: ReadonlySet<MetaFramework> = new Set([
  'next-app',
  'next-pages',
  'remix',
  'tanstack-start',
  'sveltekit',
  'nuxt',
])

interface Semver {
  major: number
  minor: number
  patch: number
}

/** Parse `1.2.3` / `v1.2.3` / `1.2` (prerelease + build stripped). `null` if unparseable. */
function parseVersion(input: string): Semver | null {
  const cleaned = input.trim().replace(/^[v=]+/, '').split(/[-+]/)[0] ?? ''
  const parts = cleaned.split('.')
  if (parts.length === 0 || parts[0] === '') return null
  const nums = parts.map((p) => Number.parseInt(p, 10))
  if (nums.some((n) => Number.isNaN(n))) return null
  return { major: nums[0] ?? 0, minor: nums[1] ?? 0, patch: nums[2] ?? 0 }
}

function cmp(a: Semver, b: Semver): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch
}

/**
 * Minimal range satisfier — the subset peerRanges actually use: `*`/empty, exact,
 * comparators (`>=`,`>`,`<=`,`<`,`=`), caret (`^`), tilde (`~`), and `workspace:*`
 * (always satisfied — the version is repo-owner-controlled, RFC-0006 D11). A `||`
 * union is supported by splitting. Unknown forms fail OPEN (treated as satisfied)
 * so an unrecognised range never wrongly blocks an install.
 */
export function satisfiesRange(version: string, range: string): boolean {
  const r = range.trim()
  if (r === '' || r === '*' || r === 'x' || r.startsWith('workspace:')) return true
  if (r.includes('||')) return r.split('||').some((part) => satisfiesRange(version, part))

  const v = parseVersion(version)
  if (!v) return true // can't parse installed version → don't block

  const m = r.match(/^(>=|<=|>|<|=|\^|~)?\s*(.+)$/)
  if (!m) return true
  const op = m[1] ?? '='
  const target = parseVersion(m[2]!)
  if (!target) return true

  switch (op) {
    case '>=':
      return cmp(v, target) >= 0
    case '>':
      return cmp(v, target) > 0
    case '<=':
      return cmp(v, target) <= 0
    case '<':
      return cmp(v, target) < 0
    case '^': {
      // Compatible within the leftmost non-zero version segment.
      if (cmp(v, target) < 0) return false
      if (target.major > 0) return v.major === target.major
      if (target.minor > 0) return v.major === 0 && v.minor === target.minor
      return v.major === 0 && v.minor === 0 && v.patch === target.patch
    }
    case '~':
      // Same major.minor, patch >=.
      return v.major === target.major && v.minor === target.minor && cmp(v, target) >= 0
    default:
      return cmp(v, target) === 0
  }
}

export function validateInstall(input: ValidateInput): ValidationResult {
  const { scan, component, installed = {} } = input
  const issues: ValidationIssue[] = []
  const err = (code: string, message: string) => issues.push({ severity: 'error', code, message })
  const warn = (code: string, message: string) => issues.push({ severity: 'warning', code, message })

  const supported = Object.keys(component.ports)

  // ── Framework-target support (D4). ─────────────────────────────────────────
  if (scan.uiBinding === 'unknown') {
    err('framework-unknown', `Could not detect the UI framework. ${component.id} supports: ${supported.join(', ')}.`)
    return { ok: false, issues }
  }
  const port = component.ports[scan.uiBinding]
  if (!port) {
    err(
      'binding-unsupported',
      `${component.id} has no "${scan.uiBinding}" port. Supported bindings: ${supported.join(', ')}.`,
    )
    return { ok: false, issues }
  }
  // The declared (uiBinding, metaFramework) pair must be shipped.
  const pairShipped = component.frameworks.some(
    (t) => t.uiBinding === scan.uiBinding && (scan.metaFramework === 'unknown' || t.metaFramework === scan.metaFramework),
  )
  if (scan.metaFramework !== 'unknown' && !pairShipped) {
    err(
      'target-unsupported',
      `${component.id} does not ship a ${scan.uiBinding} × ${scan.metaFramework} target.`,
    )
  }

  // ── Peer ranges (D11): port-level overrides component-level. ───────────────
  const peerRanges = { ...component.peerRanges, ...port.peerRanges }
  for (const [name, range] of Object.entries(peerRanges)) {
    const have = installed[name]
    if (have == null) continue // not yet installed — will be added; don't block
    if (!satisfiesRange(have, range)) {
      err('peer-mismatch', `${name}@${have} does not satisfy required ${range}.`)
    }
  }

  // ── Runtime + embedding satisfiability (D5/D6). ────────────────────────────
  const server = port.server
  if (server) {
    const noServer = NO_NODE_SERVER.has(scan.metaFramework as MetaFramework)
    if (server.runtimeRequirement === 'nodejs' && noServer && server.delivery === 'bundled') {
      err(
        'runtime-unsatisfiable',
        `${scan.metaFramework} has no Node server, but this port needs a bundled Node handler. Use a hosted endpoint instead.`,
      )
    }
    if (server.embeddingBackend === 'onnx-node' && noServer) {
      err(
        'embedding-unsatisfiable',
        `The onnx-node embedder needs a Node runtime; ${scan.metaFramework} can't run it. Use a BYO/api-remote embedder.`,
      )
    }
    // Server-only secret would land in a client bundle (D5 env scope).
    if (noServer && server.delivery === 'bundled') {
      for (const e of component.env ?? []) {
        if (e.scope === 'server' && e.required) {
          err('env-client-leak', `Server-only env "${e.name}" can't be bundled into a client-only ${scan.metaFramework} target.`)
        }
      }
    }
    // Durable rate-limit on serverless (D5).
    if (server.rateLimitBackend === 'memory' && SERVERLESS_CAPABLE.has(scan.metaFramework as MetaFramework)) {
      warn(
        'ratelimit-memory',
        `In-memory rate-limit is per-instance and ineffective on serverless ${scan.metaFramework}. Set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN for a durable limiter.`,
      )
    }
  }

  // ── TS / JS compatibility (D12). ───────────────────────────────────────────
  if (port.language === 'ts' && !scan.typescript) {
    err('language-ts-only', `${component.id}'s ${scan.uiBinding} port is TypeScript-only, but this is a JavaScript project.`)
  }

  // ── Styling (D8). ──────────────────────────────────────────────────────────
  if (port.stylingMode === 'tailwind-preset' && scan.styling.mode !== 'tailwind-preset') {
    warn('styling-tailwind', `This port expects Tailwind, which wasn't detected. The component still renders via its --ak-* tokens; wire the preset manually.`)
  }

  return { ok: !issues.some((i) => i.severity === 'error'), port, issues }
}
