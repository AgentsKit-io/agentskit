# RFC 0006 — UI component registry & shadcn-style `agentskit add`

- **Status**: Proposed
- **Version**: 3.1 (v3 consensus review + all product calls resolved — 0 open questions; see Changelog)
- **Date**: 2026-06-18
- **Author**: @EmersonBraun
- **Related issues**: —
- **Related RFCs**: [0002](./0002-agent-registry-and-ecosystem-cohesion.md) (Agent Registry), [0004](./0004-framework-binding-stability.md) (Framework binding stability)
- **Related PRs**: #1010 (Ask-the-docs chat — the first component), #1013 (extensible guardrails), registry repo (AgentsKit-io/agentskit-registry)

## Summary

Extend the existing shadcn-style `agentskit add` so it installs **UI components**
(starting with the Ask-the-docs chat), not just **agents**. `agentskit init`
writes a project config (`.agentskit/components.json`) once; thereafter
`agentskit add <name>` reads it, validates compatibility, copies framework-correct
source the user owns, installs deps, and leaves the component ready — including its
**server handler** where one is needed.

The chat is the flagship: the bar is **enterprise-grade, market-standard,
plug-and-play** — verifiable supply-chain integrity, transactional installs,
private-registry support, TS/JS parity, multi-framework + multi-backend, across
React/Next/Remix/TanStack, SvelteKit, Nuxt/Vue, Angular, React Native (Expo), and
Ink.

This RFC defines the **contracts** only. No implementation lands until accepted.
Two review rounds (v2, then a 6-lens consensus pass for v3) closed every BLOCKER;
the **Resolved decisions** section is the core, **Open questions** now holds only
genuine product calls.

## Motivation

The Ask-the-docs chat (#1010, #1013) is AgentsKit's strongest live proof —
grounded RAG, $0 free-tier, cited, generative-UI, guardrails. But it is React-only
and not installable as a component: `agentskit add` (RFC-0002) copies *agents*
into `./agents/<id>/`; there is no UI path, no project scan, no framework
detection, no placement, no server-handler delivery, no integrity verification.

shadcn/ui proved the pattern that wins adoption — *init → scan → validate → copy →
ready*, user owns the source. AgentsKit already has the registry client, the
hosted-index + raw-GitHub fetch, and a line-diff updater. This RFC reuses that and
adds the contracts an enterprise flagship requires. Each install also pulls real
downloads of the base packages the component composes.

## Resolved decisions (locked)

> v1 deferred too much. These are now decided. Each maps to a review blocker.

### D1. One verb, explicit `kind`, auto-detect

Keep a single `agentskit add <name>`. Registry items carry an **explicit**
`kind: 'agent' | 'component'` (no silent default — a missing/unknown kind is a
publish-time validation error, not an implicit agent). The CLI branches on `kind`.
No separate `ui add`.

### D2. RFC-first; reuse RFC-0002 infra

Contracts here are the deliverable. Components are a new item shape in the **same**
registry (same repo, same hosted-index + raw-GitHub fallback, same user-owns-source
+ line-diff update) — not a new system.

### D3. `agentskit init` + `components.json` (the shadcn contract)

`agentskit init` writes `.agentskit/components.json` once (committed to the repo).
Every `add` reads it first and **skips scanning/prompts**; it scans only when the
file is absent (and warns to run `init`). CI (`--yes`) trusts this file rather than
re-detecting.

```jsonc
{
  // v1 $schema is a versioned raw-GitHub tag URL so it resolves the day it ships,
  // before registry.agentskit.io hosting exists; the hosted URL becomes an alias
  // (redirect) once live, so no committed components.json ever needs to change it.
  "$schema": "https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/v1/schema/components.json",
  "schemaVersion": 1,
  "uiBinding": "react",
  "metaFramework": "next-app",
  "typescript": true,
  "rsc": true,
  "styling": { "mode": "data-attrs-only", "css": "app/global.css", "tailwindConfig": null },
  "aliases": { "components": "@/components", "lib": "@/lib", "server": "@/app/api" },
  "paths": { "root": ".", "components": "components", "lib": "lib", "server": "app/api" },
  "registries": { "default": "https://registry.agentskit.io" },
  // Private/enterprise registries: map a registry base URL → the ENV VAR NAME that
  // holds its bearer token. The secret never lives in the committed file; the CLI
  // injects `Authorization: Bearer <resolved-env>` for matching fetches.
  "registryAuth": { "https://artifactory.acme.internal/agentskit": "ACME_REGISTRY_TOKEN" },
  "linkComponent": null
}
```

In a monorepo `paths.*` anchor to a workspace package (`packages/ui/src/…`),
resolved relative to the config file, not cwd. `init` detects `pnpm-workspace.yaml`
/ `turbo.json` / `nx.json` and prompts for the target package.

The CLI reads the top-level `schemaVersion` and applies **forward-only**
migrations, preserving unknown fields; `agentskit init --upgrade` rewrites the file
to the current format. (Air-gapped/offline validators supply a local copy of the
`$schema` file.)

### D4. Two-level framework model (so the server file lands correctly)

`framework` was too coarse to know **where** a server route goes. Split it:

```ts
type UiBinding =
  | 'react' | 'svelte' | 'vue' | 'solid' | 'angular' | 'react-native' | 'ink'

type MetaFramework =
  | 'next-app' | 'next-pages' | 'remix' | 'tanstack-start' | 'astro'
  | 'sveltekit' | 'nuxt' | 'angular-ssr' | 'expo'
  | 'vite' | 'cra' | 'angular-spa' | 'node' | 'none'

interface FrameworkTarget { uiBinding: UiBinding; metaFramework: MetaFramework }
```

The scanner produces **both**. **The `ports` map is keyed by `uiBinding` alone**;
the correct server mount file within a port is selected by
`server.serverTargetByMeta[metaFramework]` (D5). The CLI builds the lookup key as
`scan.uiBinding` and rejects the install if `ports` has no matching key. A
publish-time validator rejects any `ports` key that is not a bare `UiBinding`
literal (the compound `${uiBinding}:${metaFramework}` form is **not** allowed — it
was ambiguous and is removed). The CLI never offers a
`(uiBinding, metaFramework)` pair a component hasn't shipped.

### D5. Server-handler delivery contract (resolves v1 open Q1)

Every component that needs a backend ships a framework-neutral core plus thin
per-meta-framework mounts. The core is a **Web-standard handler**:

```ts
// shipped, framework-agnostic — user owns it
export function createAskHandler(config: AskConfig): (req: Request) => Promise<Response>
```

`AskConfig` is the runtime contract every mount wraps. It carries the **security
envelope**, a **pluggable rate-limiter**, and **observability hooks** — so the four
runtime concerns (handler security, rate-limit extensibility, telemetry, structured
429/decline events) are one type, not per-port reinvention:

```ts
interface AskConfig {
  retriever: Retriever
  adapter: Adapter                       // free-pool fallback chain, etc.
  // — security envelope (explicit defaults; locked in production) —
  security?: {
    rateLimit?: { windowSec: number; max: number }   // default 60s / 10 req, in-memory
    bearerToken?: string                  // optional shared-secret auth
    corsOrigins?: string[]                // default ['*'] in dev, MUST be set in prod
    maxBodyBytes?: number                 // default 32_768
  }
  // — pluggable limiter; default = the in-memory limiter (process-local, see note) —
  rateLimiter?: (req: Request) => Promise<{ ok: boolean; retryAfterSec?: number }>
  // — observability; default no-op, each emits one structured JSON line —
  hooks?: ObservabilityHooks
}

interface ObservabilityHooks {
  onRateLimit?(ip: string, retryAfterSec: number): void
  onScopeDecline?(ip: string, reason: string, queryHash: string): void
  onError?(err: unknown, ctx: { stage: string }): void
}
```

> The default `rateLimiter` is **process-local** — correct for a single Node
> server, ineffective across serverless cold-starts / replicas. Ports declare this
> via `PortServer.rateLimitBackend` and the installer warns (below).

Per-`metaFramework` mount files adapt the handler (Next route handler, SvelteKit
`+server.ts`, Nuxt `server/api/*.post.ts`, Remix `action`, Express middleware for
`angular-ssr`, a local Node server for `ink`). The `ComponentPort.server` field
declares delivery:

```ts
interface PortServer {
  delivery: 'bundled' | 'hosted' | 'local'
  //  bundled → server file(s) installed (Next/SvelteKit/Nuxt/Remix/Express)
  //  hosted  → no server here; user points at a deployed endpoint (RN, pure SPA)
  //  local   → a local Node server script is installed (Ink/CLI)
  serverTargetByMeta?: Partial<Record<MetaFramework, string>>
  runtimeRequirement: 'nodejs' | 'edge-compatible' | 'none'
  embeddingBackend: 'onnx-node' | 'api-remote' | 'browser-wasm' | 'none'
  rateLimitBackend: 'memory' | 'external-required'  // serverless-capable ⇒ warn if 'memory'
  endpointEnvVar?: string       // hosted/local server-side endpoint, e.g. AGENTSKIT_ASK_ENDPOINT
  clientEndpointProp?: string   // the hook/component prop that receives the runtime endpoint URL
  securityHeaders?: Record<string, string>  // advisory CSP etc. (see D8/flagship)
  bundleSizeKb?: number         // optional cold-start budget tooling can assert
}
```

The validator refuses an install whose `runtimeRequirement`/`embeddingBackend` the
detected target can't satisfy (e.g. `onnx-node` on `expo`/edge) — with a concrete
message and the supported alternative, never a silent broken install.

**`serverTargetByMeta` is authoritative** for the matched `metaFramework`;
`components.json` `paths.server` is the project default applied **only** when
`serverTargetByMeta` has no entry for the detected `metaFramework`. When both are
set and disagree, the installer emits a non-blocking warning so the developer
reconciles consciously.

**Client endpoint injection.** `endpointEnvVar` is server-side. Ports whose client
must reach a runtime/deployed endpoint (Remix resource routes, TanStack Start, pure
SPA, `angular-spa`, Expo — anything not served from a predictable
`NEXT_PUBLIC_*`-style build var) MUST declare `clientEndpointProp` (the hook /
component prop, e.g. `endpointUrl`; a `configureAskChat({ endpoint })` factory is an
acceptable equivalent) and print a usage snippet passing it.

**`delivery: 'local'`** runtime lifecycle (process management, port resolution,
health-check, SIGTERM propagation) is **out of scope** for this RFC and must be
specified as a `LocalServerSpec` before the Ink port (Rollout step 7) ships.

### D6. Embedding + index portability (resolves v1 open Q2)

The committed ONNX index is **corpus-specific** (AgentsKit docs) and Node-only.
The install therefore:

1. Copies an **indexer** (`agentskit ask index ./docs`) and an **empty** index
   stub — never AgentsKit's corpus.
2. Declares `embeddingBackend` (D5). **`onnx-node` is the launch default** for Node
   servers ($0, local). `api-remote` (a **BYO** embed fn / API via `AskConfig.embed`)
   serves edge/RN/serverless without ONNX — no bundled paid provider; `browser-wasm`
   only where WASM SIMD is available. Edge/RN ports are deferred (see Open questions).
3. Loads the index at request time (not module-load) for large corpora, to keep
   serverless cold-start small.
4. Prints a "run the indexer before first use" step in the ready output.

### D7. Streaming protocol negotiation

The server speaks **NDJSON by default and SSE on `Accept: text/event-stream`**.
`ComponentPort.streamingProtocol: 'ndjson' | 'sse' | 'both'`. Angular (`HttpClient`)
and older React Native ports default to `sse`/`both` (cleaner to consume than
`ReadableStream` reader). Client port code matches its declared protocol.

### D8. Styling neutrality (enforced, not aspirational)

Review found the current widget uses ~40 hardcoded Tailwind classes, `next/link`,
and an app-local `AnimatedLogo` import — it is not actually headless. The
portability refactor is **gate-enforced** before any port ships:

- **No `className` / hardcoded color in installed source.** Visual state via
  `data-ak-*` only. `ComponentPort.stylingMode: 'data-attrs-only' | 'tailwind-preset'`.
- Tokens ship as **plain CSS** (`--ak-*`) plus a structured `cssVars` block
  (`{ light?, dark? }`) the CLI **merges** into the project's CSS entry — not a
  wholesale append. Keyframes ship as `styling.css: RegistryFile[]`.
- Cross-app imports are **inlined** (the logo) or **slotted** (`linkComponent`
  prop, default `<a>`) so non-Next ports work.

**Enforcement** is a named gate, not a comment: `check:registry-headless`
(`scripts/check-registry-headless.mjs`) grep/AST-fails on `className=`, hardcoded
color literals, `next/*` imports, and `@/components/brand/*` imports in
`registry:component` / `registry:route` **source** files (authoring-time, in the
registry repo — not installed output). It is wired into `pnpm
check:quality-gates` and is a **merge precondition** for the first port.

#### D8a. CSS-merge contract (deterministic, diff-able)

"Merge `cssVars` into the CSS entry" has one machine-readable algorithm so two CLI
implementations produce identical output and the D15 3-way diff for CSS has a
foundation:

- **Selectors**: `light` tokens → `:root`; `dark` tokens →
  `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`.
- **Block markers**: each installed block is delimited by
  `/* agentskit:<id>:start */ … /* agentskit:<id>:end */` so it can be located,
  replaced, or removed idempotently.
- **Conflict policy**: duplicate `--ak-*` token names → last-writer-wins with a
  `--verbose` warning.
- **Keyframes** are namespaced `ak-<componentId>-<name>` to avoid collisions.

### D9. Supply-chain integrity (enterprise trust)

- **Pinned refs in production**: fetch from `/refs/tags/v<semver>/`, not `main`.
  `main` only behind an explicit `--channel preview`.
- **Per-file `sha256`** in the item manifest; the CLI verifies every file after
  fetch and **aborts the whole install** on mismatch.
- **Signed index manifest** — a **minisign** detached signature (Ed25519) so the
  checksum list itself can't be poisoned; the CLI verifies it against a shipped
  Ed25519 public key embedded in the CLI binary before trusting checksums. (cosign/
  Sigstore keyless is deferred to a future ADR — it has no shipped key and needs
  outbound TLS to Fulcio/Rekor, which breaks air-gapped installs.)
- **Key distribution + rotation**: the CLI ships a bootstrap key; at install it
  fetches `keys.json` listing active keys (`kid` + `publicKey` + `validFrom` +
  optional `validUntil`). The signed manifest carries a `kid`. Two keys overlap for
  a rotation window (**≥ 30 days**); the CLI **warns** (not blocks) as the active
  key nears expiry.
- **Configurable / private registry**: resolution order `--registry` →
  `AGENTSKIT_REGISTRY_URL` → `components.json` `registries` map → default.
  Identifier forms: `name`, `@org/name` (namespaced via the map), `https://…`.
  Private-registry credentials resolve **only** via `components.json` `registryAuth`
  (base URL → env-var name) + env — a `--registry-token` argv flag is **prohibited**
  for the same reason `--api-key` is (D10).
- **Proxy/CA aware** fetch (`HTTPS_PROXY`/`NO_PROXY`/`NODE_EXTRA_CA_CERTS`) with an
  actionable error when blocked.
- **Audit**: append `.agentskit/install-log.jsonl`, an **append-only, tamper-evident**
  chain. Each entry:
  ```ts
  interface AuditEntry {
    schemaVersion: 1
    eventType: 'install' | 'update' | 'remove' | 'rollback'
    id: string; version: string; ref: string
    files: Array<{ path: string; sha256: string }>
    manifestSigRef: string            // correlates to the verified signed manifest
    prevEntryHash: string             // sha256 of the canonical prior entry ('' for first)
    timestamp: string
  }
  ```
  A future `agentskit audit` walks the `prevEntryHash` chain and fails on any
  gap/mismatch. (Retention window, HMAC, and the `audit` command itself are deferred
  to a follow-on ADR.)

### D10. Transactional, idempotent install

- **Stage → verify → atomic commit.** Write to a temp dir, verify all files +
  checksums, then move as one step. Any pre-commit failure → delete temp, roll back
  partially-written files, report "rolled back N files." Never leave a dirty tree.
  The staging temp dir is a **sibling of the target** (`target/../.agentskit-tmp-<uuid>/`),
  not `os.tmpdir()`, so `rename(2)` stays atomic (same filesystem); on `EXDEV` the
  CLI falls back to copy-then-delete and warns atomicity is best-effort. (The npm/
  pnpm/Yarn pattern.)
- **Idempotent**: identical content → silent no-op. Modified-by-user + no `--update`
  → skip with notice. Conflicts collected up front and resolved **per file**
  (interactive prompt, or `--overwrite` for the set) — never the current
  throw-on-first-conflict.
- **Secrets never via argv** — drop `--api-key`; read keys from env only.
- **`--yes`** suppresses every prompt and exits non-zero (never hangs) on any
  blocker.
- **Runs the package manager** (`scan.packageManager add …`), not just prints it;
  prompts unless `--yes`. Generates/append `.env.example` for required env.

### D11. Versioning + machine-verifiable schema

- Registry items carry `schemaVersion` and a semver `version`; CLI refuses a
  `schemaVersion` it predates.
- `ComponentPort.peerRanges: Record<string,string>` (e.g. `@agentskit/react: ">=2"`);
  validator checks installed versions and blocks on mismatch. **Port-level overrides
  component-level** for the same key (more-specific wins); `peerRanges` from all
  resolved `registryDependency` ports are collected into **one** set and conflicts
  surfaced in aggregate at the dry-run (step 7), not on first hit. The validator
  treats any resolved version beginning with `workspace:` as **always-satisfying**
  (the version is repo-owner-controlled and guaranteed present — avoids false-blocks
  for monorepo contributors).
- All registry JSON + `components.json` carry `$schema` (a versioned raw-GitHub tag
  URL in v1; hosted alias later — see D3) for editor/CI validation.

### D12. TS ↔ JS parity

`ComponentPort.language: 'ts' | 'js' | 'both'`. For `both`, parallel sources; else
a type-strip + extension-rename transform at install when `scan.typescript ===
false`. A TS-only component refuses to install into a JS project with a clear
message rather than writing broken `.tsx`.

### D13. Per-file targets + file types

`RegistryFile` gains `target?` and `type` so a component's client file, server
route, hook, lib, css, and test each land in the right place:

```ts
type RegistryFileType =
  | 'registry:component' | 'registry:hook' | 'registry:lib'
  | 'registry:route' | 'registry:page' | 'registry:css' | 'registry:test'

interface RegistryFile {
  path: string           // publish-time validated: no absolute paths, no `..` segments (D16)
  type: RegistryFileType
  sha256: string
  target?: string        // overrides defaultTarget for this file
  language?: 'ts' | 'js'
  content?: string        // optional inline; else fetched per-file by `path` (D14)
}
```

### D14. Per-file fetch, not monolithic inline

Components fetch files **individually** (cacheable, small metadata, cheap `diff`)
rather than inlining all content in one JSON like agents do. The item manifest
lists files + `sha256`; content is fetched per path. Agents keep their current
inline shape (back-compatible).

### D15. Marker, update, list (shadcn-grade sync)

`.agentskit/components.json` `installed[]` entries, keyed by `{ id, installPath }`
(monorepo-safe), each recording `ref`, `version`, and a per-file
`{ sha, installedAt }` map. This enables **3-way diff**:
`local==installed` → safe update; `local!=installed && upstream!=installed` →
conflict, show diff + prompt; `local!=installed && upstream==installed` → skip.
Commands: `agentskit diff <name>`, `agentskit update <name>`, `agentskit
components list` (all installed + sync status). `registryDependencies` resolve via
topological sort with **cycle detection** and a depth cap; dedup by `id` against
the marker.

### D16. Path containment (no write-escape)

`sha256` verifies content, the signed manifest verifies the checksum list, and
stage→atomic-commit verifies completeness — but none constrain **where** a file is
written. A valid-checksum entry with `path: '../../.env'` would escape the target
via `path.join`. Therefore:

- For every file, after `dest = join(targetDir, file.path)` the CLI MUST assert
  `path.resolve(dest).startsWith(path.resolve(targetDir) + path.sep)` and throw
  `IntegrityError` otherwise. **The same guard applies on the `diff` read path.**
- `RegistryFile.path` is **publish-time validated** to reject absolute paths and any
  `..` segment.

## Schema (consolidated)

```ts
type RegistryItem = RegistryAgent | RegistryComponent  // discriminated on `kind`

interface RegistryComponent {
  $schema: string
  schemaVersion: number
  kind: 'component'
  id: string
  version: string                    // semver
  title: string
  description: string
  category: string                   // 'chat' | …
  frameworks: FrameworkTarget[]      // declared, not implied
  ports: Record<UiBinding, ComponentPort>  // key = uiBinding alone; server file picked via server.serverTargetByMeta[metaFramework] (D4)
  packages: string[]                 // common npm deps
  peerRanges?: Record<string, string>
  env?: RegistryEnvVar[]
}

interface ComponentPort {
  uiBinding: UiBinding
  language: 'ts' | 'js' | 'both'
  stylingMode: 'data-attrs-only' | 'tailwind-preset'
  streamingProtocol: 'ndjson' | 'sse' | 'both'
  files: RegistryFile[]
  testFiles?: RegistryFile[]
  packages?: string[]
  devPackages?: string[]
  peerRanges?: Record<string, string>
  registryDependencies?: string[]
  defaultTarget: string
  server?: PortServer
  styling?: {
    cssVars?: { light?: Record<string, string>; dark?: Record<string, string> }
    css?: RegistryFile[]             // keyframes / token files, merged not appended
  }
}

interface RegistryEnvVar {
  name: string
  description: string
  required?: boolean
  scope?: 'server' | 'client' | 'build'   // server-only keys never bundled client-side
}
```

`ProjectScan` (when `components.json` absent): `{ uiBinding, metaFramework,
packageManager, typescript, srcDir, importAlias, styling:{mode,cssEntry},
monorepo:{tool,root}|null }`. Ambiguous signals resolve to `unknown`/`null` and
surface in validation — never a silent guess.

## Install flow (enterprise)

1. **Load config** (`components.json`); else scan + warn to run `init`.
2. **Resolve identifier + registry** (D9): `name` / `@org/name` / URL → base URL.
3. **Fetch item manifest** at the pinned ref; verify signature + `schemaVersion`.
4. **Branch on `kind`** — `agent` → today's path (unchanged). `component` → on.
5. **Validate** (D4/D5/D6/D11/D12/D16): lookup key = `scan.uiBinding`, reject if no
   matching port; framework-target supported; `peerRanges`; `runtimeRequirement` +
   `embeddingBackend` satisfiable; styling mode; env scope (block a server-only key
   resolving into a client bundle); TS/JS. **Warn** (non-blocking) when
   `paths.server` disagrees with `serverTargetByMeta[metaFramework]`, and when a
   serverless-capable `metaFramework` ships `rateLimitBackend: 'memory'` (naming
   `UPSTASH_REDIS_REST_URL` / `_TOKEN` + a setup link).
6. **Resolve `registryDependencies`** — topo sort, cycle-detect, dedup vs marker;
   collect all port `peerRanges` into one set (D11).
7. **Plan**. `--dry-run [--json]` prints the full structured plan (files+targets,
   deps, env, conflicts, aggregate peer-range conflicts) using the **same pipeline**
   and exits — no writes.
8. **Fetch files**, verify each `sha256`; assert path containment (D16) before any
   write.
9. **Stage → atomic commit** (D10), path-containment re-checked; conflicts resolved
   per file.
10. **Merge** `cssVars` into the CSS entry per the D8a algorithm; write/append
    `.env.example`.
11. **Write/update marker** + tamper-evident audit entry (D9/D15) atomically.
12. **Install packages** via the detected PM (prompt unless `--yes`).
13. **Ready output** — per-framework usage snippet, required env, "run the indexer"
    (D6); for non-Next/`hosted` ports a snippet passing `clientEndpointProp`; a CSP
    notice when `embeddingBackend === 'browser-wasm'` or a web-worker backend is used
    (required `worker-src blob:` / scoped `connect-src`).

## The chat as the flagship

`docs-chat` is the reference component. First port = `react` × `next-app` (the
live widget), shipped only **after** the D8 portability refactor (no `className`,
inlined logo, slotted link, server core extracted to `createAskHandler`). Files:
the headless compound shell + `useAskChat` + `Markdown` + allow-listed
generative-UI registry (client); `createAskHandler` + the Next mount + guardrails
(`lib/ask/guard.ts`, extensible per #1013) + retriever + free-pool adapter
(server); the indexer + empty index stub; merged `--ak-*` tokens/keyframes.
Everything is the user's to edit, including the guardrail rules.

The flagship's default `webWorkerBackend` (runnable snippets) spawns a worker via
blob URL with `fetch` access. Bundled handlers MUST document the required
`Content-Security-Policy` directives (`worker-src blob:`, scoped `connect-src`), and
any `WebWorkerBackend` option exposes `allowNetwork: boolean` **defaulting to
false** — resolved before the `react × next-app` port ships (Rollout step 4).

## Alternatives considered

- **Separate `agentskit ui add`** — rejected (D1): one verb + explicit `kind`.
- **`@agentskit/registry` CLI package** — rejected by RFC-0002; extend the CLI.
- **Ship the chat as an npm package** — rejected: breaks user-owns-source / forkable
  guardrails.
- **Inline all file content (agent model) for components** — rejected (D14):
  bloats the index, defeats per-file caching and cheap diff.
- **Silent `kind` default to `'agent'`** — rejected (D1): explicit + validated.
- **Single coarse `framework`** — rejected (D4): can't place server files.

## Open questions

**None — all resolved (v3.1).** The RFC has zero open items; implementation can
begin.

Resolved product calls:

1. **Launch breadth** → ship **`react × next-app` first**, expand port-by-port (each
   gated by RFC-0004 binding stability).
2. **Edge/RN/hosted embedding** → **`onnx-node` now** for Node ports ($0, local);
   edge/RN/`hosted` ports are deferred and, when they land, take a **BYO embedder
   via `AskConfig.embed`** (no bundled paid provider, preserves the $0 default).
3. **Telemetry** → **off by default**, opt-in `agentskit add --telemetry`; the wire
   contract is `ObservabilityHooks` (D5), no-op until enabled.

Resolved earlier (v3): signing = **minisign Ed25519** (cosign deferred, D9);
`$schema` = **versioned raw-GitHub tag URL** with the hosted URL as a later alias
(D3/D11) — hosting is not a blocker for kickoff.

## Rollout (once accepted)

Kickoff = **step 1 (D8)** per the locked decision — it's a self-contained refactor
of the existing chat, needs no registry, and unblocks every later port.

1. **D8 portability refactor (KICKOFF)** of the chat — extract the server core to
   `createAskHandler(AskConfig)` (define `AskConfig` + `ObservabilityHooks`), make
   the widget headless (no `className`/`next/*`/brand import; slotted `linkComponent`,
   inlined logo), **dynamic (request-time) index import**, and land the
   `check:registry-headless` gate wired into `pnpm check:quality-gates`.
2. **Contracts** — `RegistryComponent` + `FrameworkTarget` + scanner + validator +
   `components.json` + `init` (no ports yet).
3. **Integrity layer** — pinned refs, per-file sha256, signed (minisign) manifest +
   `keys.json` rotation, configurable/auth'd registry, **path-containment guard
   (D16) on write and diff read**, transactional install, tamper-evident marker +
   audit.
4. **react × next-app port** — first end-to-end `agentskit add docs-chat`.
5. **Scanner + interactive flow** — detection, validation, placement, `--dry-run`/
   `--yes`, PM execution.
6. **Second meta-framework (sveltekit)** — proves the port + server contract.
7. **Remaining ports** — remix/tanstack, nuxt/vue, angular(-ssr/-spa), expo, ink —
   each gated by binding stability (RFC-0004).
8. Graduate the stable contracts (item schema, scanner, `components.json`) to an ADR.

## Changelog

- **v3.1** — all 3 product calls resolved → **0 open questions**: launch
  `react × next-app` first; `onnx-node` now + BYO embedder (`AskConfig.embed`) for
  edge/RN later; telemetry off-by-default opt-in. Rollout reordered: **D8 is the
  implementation kickoff**. Ready to implement.
- **v3** — 6-lens consensus review (53 agents). Closed both BLOCKERs:
  **ports-map key grammar** locked to `uiBinding` alone (D4/Schema) and a
  **path-containment guard** added (new D16, on write + diff read, publish-time
  `..`/abs-path rejection). Resolved the **`AskConfig` cluster** — defined
  `AskConfig` + `ObservabilityHooks` (security envelope, pluggable `rateLimiter`,
  telemetry hooks) in D5, collapsing 5 findings into one. Also: `rateLimitBackend` /
  `clientEndpointProp` / `securityHeaders` / `bundleSizeKb` on `PortServer`;
  `serverTargetByMeta` vs `paths.server` precedence; **D8a** CSS-merge algorithm;
  D8 enforcement gate `check:registry-headless`; minisign Ed25519 + `keys.json`
  rotation, cosign deferred (resolves a v2 contradiction); `registryAuth` + a
  `--registry-token` ban; sibling temp-dir + EXDEV fallback (D10); tamper-evident
  audit-chain schema (D9); per-file `peerRanges` merge order + `workspace:`
  always-satisfy; `$schema` pinned to a versioned raw-GitHub URL (unblocks Rollout);
  web-worker CSP/`allowNetwork`; `components.json` forward-migration;
  `LocalServerSpec` (Ink) scoped out explicitly. Open questions down to 3 product
  calls. Readiness per panel: 62→ (after these) no remaining BLOCKER.
- **v2** — closed enterprise-review blockers: `init`/`components.json` (D3),
  two-level framework model (D4), server-handler delivery + neutral
  `createAskHandler` (D5), embedding/index portability (D6), streaming negotiation
  (D7), enforced styling neutrality (D8), supply-chain integrity — pinned refs,
  per-file checksums, signed manifest, private registries, proxy/CA, audit (D9),
  transactional/idempotent install + PM execution + secrets-not-in-argv (D10),
  versioning + `$schema` (D11), TS/JS parity (D12), per-file targets/types (D13),
  per-file fetch (D14), monorepo-safe marker + 3-way diff + `list` + cycle-safe
  deps (D15). Open questions reduced to product calls.
- **v1** — initial proposal: one-verb auto-detect, component schema, scanner,
  per-framework ports, basic add/validate flow.
