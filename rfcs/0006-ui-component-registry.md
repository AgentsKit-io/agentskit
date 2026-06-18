# RFC 0006 — UI component registry & shadcn-style `agentskit add`

- **Status**: Proposed
- **Date**: 2026-06-18
- **Author**: @EmersonBraun
- **Related issues**: —
- **Related RFCs**: [0002](./0002-agent-registry-and-ecosystem-cohesion.md) (Agent Registry), [0004](./0004-framework-binding-stability.md) (Framework binding stability)
- **Related PRs**: #1010 (Ask-the-docs chat — the first component), #1013 (extensible guardrails), registry repo (AgentsKit-io/agentskit-registry)

## Summary

Extend the existing shadcn-style `agentskit add` so it can install **UI components**
(starting with the Ask-the-docs chat), not just **agents**. A single command
`agentskit add <name>` scans the target project, detects its framework, validates
compatibility, asks where to place the files, copies framework-correct source the
user owns, and leaves it ready to use. The chat is the flagship: the goal is the
market-standard, plug-and-play "drop an AI chat into any app" command, across
React, Next, Svelte, Vue, Angular, React Native, and Ink.

This RFC defines the **contracts** only (registry schema, scanner, per-framework
port, add/validate flow). No implementation lands until the design is accepted.

## Motivation

The Ask-the-docs chat (RFC-0010 work, PR #1010) is the strongest live proof of
AgentsKit — grounded RAG, $0 free-tier, cited, generative-UI, guardrails. But
today it is:

- **React-only** — the composite widget exists for React; the primitives exist
  for svelte/solid/ink (full) and vue/angular/react-native (partial), but the
  composite chat is not ported.
- **Not installable as a component** — `agentskit add` (RFC-0002) copies
  *agents* (`createDocsChatAgent` → `./agents/<id>/`). There is no UI-component
  path, no project scan, no framework detection, no placement prompt.

shadcn proved the pattern that wins adoption: *scan → validate → ask → copy →
ready*, with the user owning the source. AgentsKit already has the registry
client, the hosted-index + raw-GitHub fetch, and a line-diff updater (RFC-0002).
This RFC reuses all of it and adds the UI-component shape on top.

The chat is the "last mile" for UI the way ready agents are the last mile for
runtime: each install pulls real downloads of the base packages it composes
(`@agentskit/react|svelte|…`, `@agentskit/rag`, `@agentskit/adapters`).

## Current state

The registry client (`packages/cli/src/registry.ts`) already provides:

- `RegistryAgent` schema: `{ id, title, description, category, packages, env,
  files, sources, skill }`
- `fetchAgent(id)` — hosted `registry.agentskit.io/r/<id>.json` first, raw-GitHub
  `registry/<id>/` fallback
- `addAgent(id, { outDir, force })` — writes `sources` into `./agents/<id>/`,
  refuses to clobber without `--force`
- `diffAgent(id)` + `lineDiff` — keep a copied item in sync (shadcn-style update)

`packages/cli/src/commands/add.ts` exposes `add <agent>` with `--out`, `--force`,
`--run`, `--provider/--model/--api-key`.

What is missing for components: a component schema variant, a project scanner, a
validator, an interactive placement step, and per-framework source variants.

## Decisions (locked for this RFC)

1. **One command, auto-detect.** Keep a single `agentskit add <name>`. The CLI
   fetches the registry item and branches on its `kind` (`agent` | `component`).
   No second verb. (Chosen over a separate `agentskit ui add`.)
2. **RFC-first.** Contracts here are the deliverable; implementation follows in
   linked PRs once accepted. No component ports or scanner code land under this
   RFC.
3. **Reuse RFC-0002 infrastructure.** Same registry repo, same hosted-index +
   raw-GitHub fetch, same "user owns the source" + line-diff update. Components
   are a new item shape in the *same* registry, not a new system.

## Proposal

### 1. Registry item schema — `kind` discriminator

Promote the registry item to a tagged union. Agents keep their exact current
shape (back-compatible: a missing `kind` defaults to `'agent'`).

```ts
type RegistryItem = RegistryAgent | RegistryComponent

interface RegistryComponent {
  kind: 'component'
  id: string                       // 'docs-chat'
  title: string
  description: string
  category: string                 // 'chat' | 'input' | …

  /** Frameworks this component ships a port for. */
  frameworks: Framework[]          // ['react','next','svelte','vue','angular','react-native','ink']

  /** Per-framework file sets. The scanner picks the matching entry. */
  ports: Record<Framework, ComponentPort>

  /** npm deps common to every port (per-port deps add to these). */
  packages: string[]              // ['@agentskit/rag','@agentskit/adapters']
  env?: RegistryEnvVar[]          // e.g. OPENROUTER_API_KEY (required)
}

interface ComponentPort {
  /** Files relative to the chosen install dir; sources inlined like agents. */
  files: string[]
  sources: RegistryFile[]         // { path, content }[]
  /** Extra npm deps for this framework only. */
  packages?: string[]
  devPackages?: string[]
  /** Other registry items this port needs (resolved + installed first). */
  registryDependencies?: string[]
  /** Default install dir, framework-idiomatic; overridable by scan/prompt/--out. */
  defaultTarget: string           // react: 'components/ask', angular: 'src/app/ask'
  /** Styling requirements the validator checks/applies. */
  styling?: {
    tailwind?: boolean
    cssVars?: string[]            // '--ak-*' tokens the component expects
    globalCss?: RegistryFile      // optional css to append (e.g. keyframes)
  }
}
```

`RegistryFile` (`{ path, content }`) and `RegistryEnvVar` are reused verbatim.

### 2. Project scanner contract

A pure, dependency-light module that inspects the cwd and returns a `ProjectScan`.
No network, no writes. Tested with an injectable fs (mirrors the registry client's
`fetchImpl`/`writeFileImpl` style).

```ts
interface ProjectScan {
  framework: Framework | 'unknown'   // from deps: next, react, svelte, @angular/core, react-native, ink…
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun'   // from lockfile
  typescript: boolean                // tsconfig.json present
  srcDir: string | null              // 'src' if present, else project root
  importAlias: string | null         // from tsconfig "paths" (e.g. '@/*' → '@')
  styling: { tailwind: boolean; cssEntry: string | null }
  appRouter?: boolean                // Next: app/ vs pages/
}
```

Detection rules (deterministic, documented in the implementation PR):
framework from `package.json` deps → lockfile → tsconfig → styling. Ambiguous or
missing signals resolve to `'unknown'`/`null` and surface in the validator, never
a silent guess.

### 3. Validator + add/validate flow

`agentskit add <name>`:

1. **Fetch** the item (hosted → raw fallback, existing path).
2. **Branch on `kind`.** `agent` → today's `addAgent` (unchanged). `component` →
   continue.
3. **Scan** the project (§2).
4. **Validate**:
   - `scan.framework` ∈ `component.frameworks`? If not → fail with the list of
     supported frameworks and the detected one. No partial install.
   - styling: if the port needs tailwind and the scan finds none → warn + print
     the manual step (do not hard-fail; the component still renders with the
     `--ak-*` tokens documented).
   - env: list required `env` vars the user must set.
5. **Resolve placement**: `--out` > interactive prompt (default =
   `port.defaultTarget`, joined under `scan.srcDir`/alias). `--yes` skips the
   prompt and takes the default (CI-friendly).
6. **Resolve `registryDependencies`** recursively, install those components first.
7. **Write** `port.sources` (refuse to clobber without `--force`, existing rule);
   append `styling.globalCss` if present.
8. **Report**: files written, `npm/pnpm/yarn install <packages>`, required env,
   and a one-line "ready" usage snippet for the detected framework.

`agentskit add <name> --dry-run` prints the plan (framework, target, files, deps)
without writing — the scan/validate output as a preview.

### 4. Per-framework port contract

Each component publishes a `ComponentPort` per supported framework. A port is
**self-contained and idiomatic**: it composes that framework's `@agentskit/*`
binding (`useChat` for react/vue/solid/svelte, the Ink components for terminal),
uses only `data-ak-*` + `--ak-*` tokens (headless, no hardcoded colors — matches
the framework convention in CLAUDE.md), and ships no styles beyond the optional
`globalCss`.

Port parity is **declared, not implied**: a component lists only the frameworks
it actually ships. `docs-chat` ships `react` + `next` first (the live widget);
svelte/vue/angular/react-native/ink are added as ports land, each gated by the
binding's stability tier (RFC-0004). The CLI never offers a framework a component
hasn't shipped.

### 5. Update path

`agentskit diff <name>` / update already exists for agents (`diffAgent` +
`lineDiff`). For components it diffs against the **active port** at the recorded
install dir. The install writes a tiny `.agentskit/components.json` marker
(`{ id, framework, target }`) so update knows which port and where, without
re-scanning.

## The chat as the flagship

`docs-chat` is the first and reference component. Its port files are the existing
React widget set, refactored to be registry-portable:

- `ask-widget.tsx` (headless compound shell), `useAskChat`, `Markdown`,
  `registry` (allow-listed generative-UI render boundary)
- `lib/ask/guard.ts` (the extensible triage + scope guard from #1013),
  `lib/rag/*` (retriever + cited context), `lib/openrouter.ts` (free pool)
- `app/api/ask-docs/route.ts` as a framework-appropriate server handler (Next
  route handler for the `next` port; documented adapter for others)
- `globalCss`: the `--ak-*` keyframes (loading dots, AI shimmer)

Everything the user installs is theirs to edit — including the guardrail rules,
which `triageMessage(query, extra)` already accepts additively.

## Alternatives considered

- **Separate `agentskit ui add` namespace** — rejected per decision §1; one verb,
  auto-detect is simpler for users and keeps RFC-0002's surface.
- **A `@agentskit/registry` CLI package** — rejected by RFC-0002 already; extend
  the existing CLI.
- **Ship the chat as an installable npm package** — rejected: violates the "user
  owns the source / shadcn-style" principle that makes the components forkable
  and the guardrails extensible.
- **Per-framework `create-*` scaffolds instead of `add`** — rejected: scaffolds
  start new projects; `add` drops into existing ones, which is the adoption case.

## Open questions

1. **Server-side portability.** The chat's grounding route is a Next handler.
   For non-Next React (Vite) and other frameworks, do we ship a framework-neutral
   request handler the user mounts, or per-framework server adapters? (Leaning:
   one neutral `handleAskRequest(req)` core + thin per-framework mounts.)
2. **Embedding at install vs runtime.** The committed ONNX index (`gen-ask-index`)
   is docs-specific. The component should ship the *indexer script* + an empty
   index, not a corpus. Confirm the install copies the script and documents
   "run it against your docs", not a prebuilt index.
3. **Marker file location.** `.agentskit/components.json` vs per-component
   frontmatter. (Leaning: single `.agentskit/components.json`.)
4. **Framework rollout order** after react/next: svelte + vue (full `useChat`),
   then angular + react-native (partial bindings — gated by RFC-0004), ink last.

## Rollout (once accepted)

1. **Contracts** — land `RegistryComponent` + scanner + validator types in the
   CLI (no ports yet), behind the existing `add` command.
2. **React/Next port** — make `docs-chat` registry-portable; first end-to-end
   `agentskit add docs-chat` into a fresh Next app.
3. **Scanner + interactive flow** — detection, validation, placement prompt,
   `--dry-run`/`--yes`.
4. **Second framework** (svelte) — proves the port contract generalizes.
5. **Remaining ports** — vue, angular, react-native, ink, each gated by binding
   stability (RFC-0004).
6. Graduate the stable contracts (item schema, scanner) to an ADR.
