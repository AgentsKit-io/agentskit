# RFC 0006 — UI component registry & shadcn-style `agentskit add`

- **Status**: Proposed
- **Version**: 2 (v1 → v2 hardened after adversarial enterprise review — see Changelog)
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
v2 closes the blockers found in review; the **Resolved decisions** section is the
core, **Open questions** now holds only genuine product calls.

## Motivation

The Ask-the-docs chat (#1010, #1013) is AgentsKit's strongest live proof —
grounded RAG, $0 free-tier, cited, generative-UI, guardrails. But it is React-only
and not installable as a component: `agentskit add` (RFC-0002) copies *agents*
into `./agents/<id>/`; there is no UI path, no project scan, no framework
detection, no placement, no server-handler delivery, no integrity verification.

shadcn/ui proved the pattern that wins adoption — *init → scan → validate → copy →
ready*, user owns the source. AgentsKit already has the registry client, the
hosted-index + raw-GitHub fetch, and a line-diff updater. v2 reuses that and adds
the contracts an enterprise flagship requires. Each install also pulls real
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
  "$schema": "https://registry.agentskit.io/schema/components.json",
  "schemaVersion": 1,
  "uiBinding": "react",
  "metaFramework": "next-app",
  "typescript": true,
  "rsc": true,
  "styling": { "mode": "data-attrs-only", "css": "app/global.css", "tailwindConfig": null },
  "aliases": { "components": "@/components", "lib": "@/lib", "server": "@/app/api" },
  "paths": { "root": ".", "components": "components", "lib": "lib", "server": "app/api" },
  "registries": { "default": "https://registry.agentskit.io" },
  "linkComponent": null
}
```

In a monorepo `paths.*` anchor to a workspace package (`packages/ui/src/…`),
resolved relative to the config file, not cwd. `init` detects `pnpm-workspace.yaml`
/ `turbo.json` / `nx.json` and prompts for the target package.

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

The scanner produces **both**. UI files key on `uiBinding`; server files key on
`metaFramework`. The CLI never offers a `(uiBinding, metaFramework)` pair a
component hasn't shipped.

### D5. Server-handler delivery contract (resolves v1 open Q1)

Every component that needs a backend ships a framework-neutral core plus thin
per-meta-framework mounts. The core is a **Web-standard handler**:

```ts
// shipped, framework-agnostic — user owns it
export function createAskHandler(config: AskConfig): (req: Request) => Promise<Response>
```

Per-`metaFramework` mount files adapt it (Next route handler, SvelteKit
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
  endpointEnvVar?: string  // for hosted/local: e.g. AGENTSKIT_ASK_ENDPOINT
}
```

The validator refuses an install whose `runtimeRequirement`/`embeddingBackend` the
detected target can't satisfy (e.g. `onnx-node` on `expo`/edge) — with a concrete
message and the supported alternative, never a silent broken install.

### D6. Embedding + index portability (resolves v1 open Q2)

The committed ONNX index is **corpus-specific** (AgentsKit docs) and Node-only.
The install therefore:

1. Copies an **indexer** (`agentskit ask index ./docs`) and an **empty** index
   stub — never AgentsKit's corpus.
2. Declares `embeddingBackend` (D5). `onnx-node` for Node servers;
   `api-remote` (call an embedding API) for edge/RN/serverless without ONNX;
   `browser-wasm` only where WASM SIMD is available.
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

### D9. Supply-chain integrity (enterprise trust)

- **Pinned refs in production**: fetch from `/refs/tags/v<semver>/`, not `main`.
  `main` only behind an explicit `--channel preview`.
- **Per-file `sha256`** in the item manifest; the CLI verifies every file after
  fetch and **aborts the whole install** on mismatch.
- **Signed index manifest** (minisign/cosign detached signature) so the checksum
  list itself can't be poisoned; CLI verifies the signature against a shipped
  public key before trusting checksums.
- **Configurable / private registry**: resolution order `--registry` →
  `AGENTSKIT_REGISTRY_URL` → `components.json` `registries` map → default.
  Identifier forms: `name`, `@org/name` (namespaced via the map), `https://…`.
- **Proxy/CA aware** fetch (`HTTPS_PROXY`/`NO_PROXY`/`NODE_EXTRA_CA_CERTS`) with an
  actionable error when blocked.
- **Audit**: append `.agentskit/install-log.jsonl` (id, version, ref, files+sha,
  timestamp) — the artifact a future `agentskit audit` consumes.

### D10. Transactional, idempotent install

- **Stage → verify → atomic commit.** Write to a temp dir, verify all files +
  checksums, then move as one step. Any pre-commit failure → delete temp, roll back
  partially-written files, report "rolled back N files." Never leave a dirty tree.
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
  validator checks installed versions and blocks on mismatch.
- All registry JSON + `components.json` carry `$schema` for editor/CI validation.

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
  path: string
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
  ports: Record<string, ComponentPort>  // key = `${uiBinding}:${metaFramework}` or `${uiBinding}`
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
5. **Validate** (D4/D5/D6/D11/D12): framework-target supported; `peerRanges`;
   `runtimeRequirement` + `embeddingBackend` satisfiable; styling mode; env scope
   (block a server-only key resolving into a client bundle); TS/JS.
6. **Resolve `registryDependencies`** — topo sort, cycle-detect, dedup vs marker.
7. **Plan**. `--dry-run [--json]` prints the full structured plan (files+targets,
   deps, env, conflicts) using the **same pipeline** and exits — no writes.
8. **Fetch files**, verify each `sha256`.
9. **Stage → atomic commit** (D10); conflicts resolved per file.
10. **Merge** `cssVars` into the CSS entry; write/append `.env.example`.
11. **Write/update marker** + audit log (D9/D15) atomically.
12. **Install packages** via the detected PM (prompt unless `--yes`).
13. **Ready output** — per-framework usage snippet, required env, "run the indexer"
    (D6), endpoint setup for `hosted`/`local`.

## The chat as the flagship

`docs-chat` is the reference component. First port = `react` × `next-app` (the
live widget), shipped only **after** the D8 portability refactor (no `className`,
inlined logo, slotted link, server core extracted to `createAskHandler`). Files:
the headless compound shell + `useAskChat` + `Markdown` + allow-listed
generative-UI registry (client); `createAskHandler` + the Next mount + guardrails
(`lib/ask/guard.ts`, extensible per #1013) + retriever + free-pool adapter
(server); the indexer + empty index stub; merged `--ak-*` tokens/keyframes.
Everything is the user's to edit, including the guardrail rules.

## Alternatives considered

- **Separate `agentskit ui add`** — rejected (D1): one verb + explicit `kind`.
- **`@agentskit/registry` CLI package** — rejected by RFC-0002; extend the CLI.
- **Ship the chat as an npm package** — rejected: breaks user-owns-source / forkable
  guardrails.
- **Inline all file content (agent model) for components** — rejected (D14):
  bloats the index, defeats per-file caching and cheap diff.
- **Silent `kind` default to `'agent'`** — rejected (D1): explicit + validated.
- **Single coarse `framework`** — rejected (D4): can't place server files.

## Open questions (genuine product calls — need your decision)

1. **Launch framework breadth.** Ship `react×next-app` first and expand, or block
   the GA announcement until `sveltekit` + `nuxt` also ship? (Recommendation:
   ship react/next first; each later port gated by RFC-0004 binding stability.)
2. **Signing toolchain.** minisign (tiny, simple) vs cosign/Sigstore (heavier,
   ecosystem-standard, keyless OIDC). (Recommendation: minisign now, cosign later.)
3. **Stand up `registry.agentskit.io` (hosted + signed) now**, or run on
   tag-pinned raw-GitHub + checksums until volume justifies hosting?
4. **Default embedding for `hosted`/edge ports** — bundle a small `api-remote`
   embedder (which provider?) or require the user to supply one?
5. **Telemetry** — default off, opt-in `agentskit add --telemetry`? (Recommendation:
   off by default.)

## Rollout (once accepted)

1. **Contracts** — land `RegistryComponent` + `FrameworkTarget` + scanner +
   validator + `components.json` + `init` (no ports yet).
2. **Integrity layer** — pinned refs, per-file sha256, signed manifest, configurable
   registry, transactional install, marker + audit.
3. **D8 portability refactor** of the chat (headless gate, server core extraction).
4. **react × next-app port** — first end-to-end `agentskit add docs-chat`.
5. **Scanner + interactive flow** — detection, validation, placement, `--dry-run`/
   `--yes`, PM execution.
6. **Second meta-framework (sveltekit)** — proves the port + server contract.
7. **Remaining ports** — remix/tanstack, nuxt/vue, angular(-ssr/-spa), expo, ink —
   each gated by binding stability (RFC-0004).
8. Graduate the stable contracts (item schema, scanner, `components.json`) to an ADR.

## Changelog

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
