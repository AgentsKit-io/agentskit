/**
 * UI component registry — contract types (RFC-0006).
 *
 * The shadcn-style `agentskit add <name>` installs **UI components** (not just
 * agents) into a user's project. This module is the single, machine-checkable
 * contract shared by the CLI (`add`/`init`/scanner/validator), the registry
 * authoring/publish tooling, and the `components.json` project config. It is
 * intentionally pure types + a couple of literal arrays (no runtime logic), so it
 * stays a stable foundation the rest of the subsystem builds on.
 *
 * See `rfcs/0006-ui-component-registry.md` for the rationale behind each field.
 */

// ── Framework model (RFC-0006 D4) ──────────────────────────────────────────
// Two levels: the UI binding (what the component is written against) and the
// meta-framework (which decides WHERE a server file lands). The `ports` map is
// keyed by `uiBinding` alone; the server mount file is selected inside a port via
// `server.serverTargetByMeta[metaFramework]`.

export const UI_BINDINGS = [
  'react',
  'svelte',
  'vue',
  'solid',
  'angular',
  'react-native',
  'ink',
] as const
export type UiBinding = (typeof UI_BINDINGS)[number]

export const META_FRAMEWORKS = [
  'next-app',
  'next-pages',
  'remix',
  'tanstack-start',
  'astro',
  'sveltekit',
  'nuxt',
  'angular-ssr',
  'expo',
  'vite',
  'cra',
  'angular-spa',
  'node',
  'none',
] as const
export type MetaFramework = (typeof META_FRAMEWORKS)[number]

export interface FrameworkTarget {
  uiBinding: UiBinding
  metaFramework: MetaFramework
}

// ── Registry item shape (RFC-0006 D1, D11, D13, D14) ───────────────────────

/** Discriminator. Explicit — a missing/unknown kind is a publish-time error. */
export type RegistryItemKind = 'agent' | 'component'

export type RegistryFileType =
  | 'registry:component'
  | 'registry:hook'
  | 'registry:lib'
  | 'registry:route'
  | 'registry:page'
  | 'registry:css'
  | 'registry:test'

export interface RegistryFile {
  /** Relative path. Publish-time validated: no absolute paths, no `..` segments (D16). */
  path: string
  type: RegistryFileType
  /** SHA-256 of the file content; verified after fetch, whole install aborts on mismatch. */
  sha256: string
  /** Overrides the port's `defaultTarget` for this file. */
  target?: string
  language?: 'ts' | 'js'
  /** Optional inline content; otherwise fetched per-file by `path` (D14). */
  content?: string
}

export interface RegistryEnvVar {
  name: string
  description: string
  required?: boolean
  /** Server-only keys must never be bundled client-side. */
  scope?: 'server' | 'client' | 'build'
}

/** How a component's backend handler is delivered + its runtime constraints (D5). */
export interface PortServer {
  delivery: 'bundled' | 'hosted' | 'local'
  /** For `bundled`: where the per-meta-framework mount file lands. */
  serverTargetByMeta?: Partial<Record<MetaFramework, string>>
  runtimeRequirement: 'nodejs' | 'edge-compatible' | 'none'
  embeddingBackend: 'onnx-node' | 'api-remote' | 'browser-wasm' | 'none'
  /** Serverless-capable meta-frameworks ⇒ installer warns when this is `memory`. */
  rateLimitBackend: 'memory' | 'external-required'
  /** Server-side endpoint env var, for `hosted`/`local`. */
  endpointEnvVar?: string
  /** The hook/component prop that receives the runtime endpoint URL (client side). */
  clientEndpointProp?: string
  /** Advisory security headers (e.g. CSP for a web-worker backend). */
  securityHeaders?: Record<string, string>
  /** Optional cold-start budget tooling can assert. */
  bundleSizeKb?: number
}

export interface PortStyling {
  /** Token values merged into the project CSS entry (D8a), split by scheme. */
  cssVars?: { light?: Record<string, string>; dark?: Record<string, string> }
  /** Keyframe / token files, merged (not appended) into the CSS entry. */
  css?: RegistryFile[]
}

export interface ComponentPort {
  uiBinding: UiBinding
  language: 'ts' | 'js' | 'both'
  stylingMode: 'data-attrs-only' | 'tailwind-preset'
  streamingProtocol: 'ndjson' | 'sse' | 'both'
  files: RegistryFile[]
  testFiles?: RegistryFile[]
  /** Extra npm deps for this port (added to the component-level `packages`). */
  packages?: string[]
  devPackages?: string[]
  /** Port-level peer ranges override component-level for the same key (D11). */
  peerRanges?: Record<string, string>
  /** Other registry items installed first (topo-sorted, cycle-detected). */
  registryDependencies?: string[]
  /** Framework-idiomatic default install dir; overridable by scan/prompt/`--out`. */
  defaultTarget: string
  server?: PortServer
  styling?: PortStyling
}

export interface RegistryComponent {
  /** Versioned schema URL for editor/CI validation. */
  $schema: string
  schemaVersion: number
  kind: 'component'
  id: string
  /** Semver. */
  version: string
  title: string
  description: string
  category: string
  /** Declared, not implied — the CLI never offers an unshipped target. */
  frameworks: FrameworkTarget[]
  /** Keyed by `uiBinding` (D4). */
  ports: Partial<Record<UiBinding, ComponentPort>>
  /** npm deps common to every port. */
  packages: string[]
  peerRanges?: Record<string, string>
  env?: RegistryEnvVar[]
}

// ── Project scan (RFC-0006 D3/D4) ──────────────────────────────────────────
// Produced when `.agentskit/components.json` is absent. Ambiguous signals resolve
// to `'unknown'`/`null` and surface in validation — never a silent guess.

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export interface ProjectScan {
  uiBinding: UiBinding | 'unknown'
  metaFramework: MetaFramework | 'unknown'
  packageManager: PackageManager
  typescript: boolean
  /** `'src'` when present, else the project root. */
  srcDir: string | null
  /** From tsconfig `paths` (e.g. `@/*` → `@`). */
  importAlias: string | null
  styling: { mode: 'data-attrs-only' | 'tailwind-preset'; cssEntry: string | null }
  monorepo: { tool: 'pnpm' | 'turbo' | 'nx'; root: string } | null
}

// ── Project config — `.agentskit/components.json` (RFC-0006 D3) ─────────────

export interface ComponentsConfig {
  $schema: string
  schemaVersion: number
  uiBinding: UiBinding
  metaFramework: MetaFramework
  typescript: boolean
  rsc?: boolean
  styling: { mode: 'data-attrs-only' | 'tailwind-preset'; css: string; tailwindConfig: string | null }
  aliases: { components: string; lib: string; server: string }
  paths: { root: string; components: string; lib: string; server: string }
  /** Named registries; `default` is required. */
  registries: Record<string, string>
  /** Private registries: base URL → ENV VAR NAME holding its bearer token (D9). */
  registryAuth?: Record<string, string>
  /** Slotted link component for the installed UI (default `<a>`). */
  linkComponent?: string | null
  /** Recorded installs (monorepo-safe), enabling 3-way diff/update (D15). */
  installed?: InstalledComponent[]
}

/** A recorded install, keyed by `{ id, installPath }` (RFC-0006 D15). */
export interface InstalledComponent {
  id: string
  kind: 'component'
  framework: FrameworkTarget
  installPath: string
  ref: string
  version: string
  /** Per-file content hash at install time → enables the 3-way diff. */
  files: Record<string, { sha: string; installedAt: string }>
}

// ── Supply-chain (RFC-0006 D9) ─────────────────────────────────────────────

/** Append-only, tamper-evident audit entry written to `.agentskit/install-log.jsonl`. */
export interface AuditEntry {
  schemaVersion: 1
  eventType: 'install' | 'update' | 'remove' | 'rollback'
  id: string
  version: string
  ref: string
  files: Array<{ path: string; sha256: string }>
  /** Correlates the entry to the verified signed manifest. */
  manifestSigRef: string
  /** SHA-256 of the canonical prior entry (`''` for the first). */
  prevEntryHash: string
  timestamp: string
}

/** A signing key from the registry's `keys.json` (minisign Ed25519, D9). */
export interface SigningKey {
  kid: string
  publicKey: string
  validFrom: string
  validUntil?: string
}
