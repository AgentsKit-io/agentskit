# Grok round 2 editorial review

**Status:** reviewed input, not product truth · **Reviewer:** Codex · **Date:** 2026-07-15

Grok inspected detached `origin/main`/`origin/master` worktrees in read-only mode. Its
packets are discovery input only. Paths and claims must be revalidated in the owning
repository before editing.

## Accepted routing input

### Registry

- Generic copy originates primarily in `scripts/lib/v1-enhance.mjs`; generated public
  artifacts flow through `scripts/build-registry.mjs` and deterministic discovery.
- Manual CTAs and generated artifacts share the broken `/agents` assumption and must use a
  single canonical route source.
- `products[]`, not the deprecated four-property projection, must generate the six-peer
  block in `llms.txt`, `llms-full.txt`, and `for-agents`.
- Descriptions should migrate by category after fixing the generator, with a CI ban on the
  old generic suffix.

### Playbook

- Add a real `for-agents` entry point and route it through metadata, Doc Bridge ownership,
  deterministic discovery, and the human index.
- Highest-value visual candidates include the adoption matrix, event streaming,
  observability, CI/CD, cost optimization, and AI/LLM safety pages.
- Existing ecosystem components and discovery code still assume four products and need a
  generated seven-product source.

### Doc Bridge

- Historical `DOGFOOD*` content must not outrank current product guidance in the indexed
  corpus.
- Fumadocs, README, static landing, and machine surfaces need one canonical hierarchy.
- `config-v1.md` should become a compact contract/reference with examples moved to tested
  task pages.
- Marketplace work is preparation only: action metadata, release/pinning guidance, smoke
  evidence, owner agreement, and 2FA checks. This round does not publish.

### Code Review

- The seven verified review lenses live in `agents/code-review/lenses.ts`; public copy must
  preserve their meanings and the conventions severity ceiling.
- The advisory-to-blocking diagram must distinguish Action and CLI defaults and exit codes
  0, 1, and 2.
- `llms-full.txt` and a lenses handoff can be curated from verified README, operations,
  action metadata, and agent source.

### AKOS

- Reconcile the product name AgentsKitOS/AKOS, CLI `agentskit-os`, package namespace, TS/Zod
  contracts, YAML pack/whitelabel files, pnpm lockfile, and demo/seed versus production
  terminology.
- Package, app, and vertical counts must be derived from workspace/source directories, not
  copied between `AGENTS.md`, `Claude.md`, and marketing docs.
- Doc Bridge onboarding should provide operator, integrator, and coding-agent routes with
  visual key journeys, without exposing private implementation detail.

## Rejected or corrected conclusions

- Fumadocs is a documentation technology, not an ecosystem product. The Code Review peers
  are AgentsKit, Registry, Chat, Playbook, Doc Bridge, and AKOS.
- AKOS “six peers” means those six products, not six internal documentation entry points.
- Registry route and favicon ownership must be revalidated against the deployed build
  pipeline before choosing which repository receives the fix.
- The canonical source is `ecosystem.json` v2 `products[]`. The deprecated `properties[]`
  projection must not be expanded into a second source of truth.
- AKOS is excluded only from rendering the large continuation component. It remains in the
  seven-item global navigation and contextual cross-link graph.

## Delegation boundary for implementation

Grok may prepare category copy, page-to-visual mappings, and concise drafts in disposable
worktrees. Codex owns route changes, generators, schemas, Doc Bridge configuration, tests,
cross-repository sync, source validation, and final certification.
