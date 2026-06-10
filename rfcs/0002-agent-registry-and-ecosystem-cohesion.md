# RFC 0002 — Agent Registry & ecosystem cohesion

- **Status**: Accepted
- **Date**: 2026-06-09
- **Author**: @EmersonBraun
- **Related issues**: —
- **Related PRs**: registry repo (AgentsKit-io/agentskit-registry), #927 (`agentskit add`)

## Decisions refined during approval

1. **Ecosystem bar distribution**: a hosted `ecosystem-bar.js` script embedded via
   `<script>` on all four sites (central update), served from the live main site
   (`agentskit.io/ecosystem-bar.js`) — not a published package or per-site copy.
2. **AKOS CTA**: "Deploy on AKOS — coming soon" → waitlist. AKOS does not yet
   import registry agents; the CTA stays honest.
3. **Registry CLI**: extend the existing `agentskit` CLI with `add <agent>` (not a
   new `@agentskit/registry` CLI package). Agents live in the separate registry
   repo; the CLI fetches the hosted index (raw-GitHub fallback).
4. **Repo**: `AgentsKit-io/agentskit-registry` created and seeded.

## Summary

Ship ready-to-use, opinionated agents as a **separate registry** (shadcn-style
`add` that copies source into the user's project) hosted on its own site
`registry.agentskit.io`, rather than as a package inside the framework monorepo.
At the same time, define how the four public properties —
`www.agentskit.io`, `playbook.agentskit.io`, `registry.agentskit.io`, and
`akos.agentskit.io` — cross-reference each other so the OSS framework, the
playbook, the agent registry, and AKOS form one coherent funnel instead of four
disconnected sites.

## Motivation

AgentsKit has deep primitives (27 skills, 30 integrations, 4 multi-agent
topologies, RAG, durable runtime) but **zero ready-to-deploy agents**. New users
must wire skill + tools + runtime themselves — the "last mile" that blocks
adoption. Ready agents close that gap and are the strongest honest lever for real
installs (each agent pulls real downloads of the base packages it uses).

But ready agents are a **different product shape** from the framework:

| | Framework (monorepo) | Ready agents |
|---|---|---|
| Nature | stable contracts, slow, strict | opinionated, fast-moving, trend-driven |
| Cadence | contract freeze (RFC-0007), deprecation cycles | weekly, experimental |
| Gates | 9 structural gates, contract freeze | lightweight, community-friendly |
| Manifesto pull | "stability is the feature" | "earn our place every day" |

Putting churny, opinionated agents inside the contract-frozen monorepo pollutes
the foundation and fights the Manifesto ("boundaries earned", "stability is the
feature", "prefer deleting code to adding code").

Separately, the ecosystem has grown to four properties with **no cross-linking
strategy**. A visitor on the marketing site does not discover the registry; a
registry user is not routed to AKOS for managed deployment; the playbook's
authority does not feed either. Four sites, one brand, zero funnel.

## Current state

- **`www.agentskit.io`** — marketing + OSS framework docs (Fumadocs, ADR-0007).
- **`playbook.agentskit.io`** — engineering playbook / standards the repo is
  audited against (see `project_playbook-alignment`).
- **`akos.agentskit.io`** — AgentsKitOS, the platform built on top of the OSS core.
- Ready agents: do not exist. `agentskit init` has 13 project templates; the
  `planner` skill names delegates but nothing is wired end-to-end.
- No shared navigation, footer, or contextual cross-links across the four sites.

## Options considered

### A. `@agentskit/agents` package inside the monorepo

A published package that composes runtime + skills + tools + adapters into
one-line agents (`createResearchAgent()`).

**Pros:**
- Unified release and interop with the rest of the monorepo.
- Own npm downloads per agent.

**Cons:**
- Speculative package boundary — ADR-0009 #4 ("boundaries earned, not
  pre-designed; split only when a real second consumer forces it").
- Couples a fast-churning, opinionated surface to the contract-frozen core;
  fights Manifesto #1/#8 (stability) and "prefer deleting code".
- Every agent change runs the full 9-gate monorepo CI — high friction for what
  should be rapid, community-driven content.

### B. Separate registry repo, shadcn-style `add` (recommended)

A standalone repo (`AgentsKit-io/agentskit-registry`) with a CLI that **copies an
agent's source into the user's project** (`npx @agentskit/registry add research`),
consuming only **published** `@agentskit/*` packages. Hosted gallery at
`registry.agentskit.io`.

**Pros:**
- **Zero lock-in (Manifesto #4) taken to the limit** — the user owns the copied
  code; there is nothing to `npm uninstall`.
- **External plug-and-play proof (Manifesto #2)** — the registry consumes the
  published packages exactly as a real user would; it is the honest integration test.
- **Real downloads** — each `add` installs `@agentskit/runtime|skills|adapters|
  tools` for real. Numbers rise from use, not vanity.
- **Sidesteps the "earned boundary" question** — no new framework package.
- **Own discovery surface** — second GitHub repo + `registry.agentskit.io` =
  independent stars/SEO/marketing.
- **Community-friendly** — contributors submit an agent to a focused repo with
  light gates, never the strict monorepo.
- **Protects the foundation** — experiments cannot destabilize frozen contracts.

**Cons:**
- Interop drift: the registry must track `@agentskit/*` versions (mitigated by CI
  against `latest` + Renovate/Dependabot — and tracking published versions is
  exactly the test we want).
- Two repos, two CIs (mitigated: registry gates are light).
- Split discovery (mitigated by the cohesion plan below).

### C. Published agent packages from a separate repo (`@agentskit/agent-*`)

Separate repo, but each agent is its own npm package rather than copy-in source.

**Pros:**
- Own downloads + a separate repo's cadence.

**Cons:**
- Version lock-in returns (the user depends on our package version).
- Dozens of tiny published packages to version and maintain — exactly the
  proliferation ADR-0009 warns against.

### D. Templates only (inside `agentskit init`)

Ready agents as additional `init` templates.

**Pros:**
- Zero new repo, drives base-package downloads.

**Cons:**
- No own product surface or registry site; less discoverable; "scaffold once"
  rather than an evolving, browsable gallery.

## Decision

**Adopt option B: a separate registry repo with shadcn-style `add`, hosted at
`registry.agentskit.io`, plus an ecosystem cohesion layer across all four
properties.**

Rationale: B is the only option that is simultaneously (1) Manifesto-aligned
(zero lock-in, earned boundaries, foundation stability), (2) a real-download
driver, and (3) its own marketing/discovery surface — which is the actual goal.
The framework monorepo stays pure; opinionated agents live where they can move fast.

`@agentskit/mcp` (the MCP server bridging `@agentskit/integrations`) is **not**
affected by this RFC — it is framework/infra with an earned boundary and stays in
the monorepo.

### Part 1 — The registry

- **Repo**: `AgentsKit-io/agentskit-registry`.
- **CLI**: `npx @agentskit/registry add <agent>` copies a self-contained agent
  folder into the user's project (default `./agents/<name>`). Also `list` and
  `info <agent>`.
- **Agent shape** (one folder, self-contained):
  - `agent.ts` — wires a published skill + tools + runtime; named export
    `create<Name>Agent()`.
  - `meta.json` — id, title, description, category, the `@agentskit/*` packages
    and env keys it needs, tags, AKOS-deployable flag. Drives the site gallery.
  - `README.md` — concept + usage + troubleshooting (Manifesto #6).
  - `*.test.ts` — at least "constructs and runs against a mock adapter".
- **Consumes only published packages.** No path into framework internals.
- **Light gates**: lint, typecheck, "runs against mock adapter", `meta.json`
  schema valid. No contract-freeze, no 9-gate suite.
- **Seed agents**: `research`, `pr-review` (dogfoods on our own repos), `sql`,
  `docs-chat` (chat-with-a-repo), `support`, `cron-digest`.

### Part 2 — `registry.agentskit.io`

- A gallery that reads each agent's `meta.json`: searchable/filterable by
  category, with per-agent pages (what it does, the `add` command, required env,
  packages used, live "copy" snippet).
- Same design system / tokens as `www` (shared UI, not a fork).
- Per-agent "Deploy managed on AKOS" CTA when `meta.akosDeployable`.

### Part 3 — Ecosystem cohesion (the cross-reference layer)

The four properties form one funnel: **OSS (www + registry) drives adoption →
playbook supplies authority → AKOS captures managed/monetized usage.**

**Shared "ecosystem bar"** — one top-nav component (shared package or copied
contract) on all four sites linking `Framework · Playbook · Registry · AKOS`,
with the current property highlighted. Consistent footer listing all four.

**Contextual cross-links (one thing leads to the next):**

| From | Links to | Anchor |
|------|----------|--------|
| www (framework) | registry | "Don't wire it yourself — start from a ready agent" |
| www | playbook | "Build it right — engineering standards" |
| www | akos | "Run it in production — managed platform" |
| registry (agent page) | www | the packages this agent uses (deep links to API docs) |
| registry | akos | "Deploy this agent managed" (per-agent CTA) |
| registry | playbook | patterns/topologies this agent applies |
| playbook | registry | reference implementations of the pattern |
| playbook | www | the APIs that implement the standard |
| akos | registry | import a registry agent into a workspace |
| akos | www / playbook | "Built on the OSS core" / "Follows the playbook" |

**Shared infrastructure:**
- One design-token set + nav/footer contract across properties.
- Unified analytics (PostHog already in use) with cross-property funnel events.
- Cross-submitted sitemaps + consistent canonical/OG metadata so the four rank
  as one brand.

## Implementation plan

1. **This RFC** approved (Manifesto #10 — open by default, RFC before big moves).
2. **Cohesion contract first** (small, high-leverage): define the shared
   ecosystem-bar + footer + token contract; add it to `www` and `akos`. This is
   valuable even before the registry exists.
3. **Registry repo scaffold**: CLI (`add`/`list`/`info`), `meta.json` schema,
   agent folder convention, light CI.
4. **Seed agents**: `research` + `pr-review` first (dogfood), then `sql`,
   `docs-chat`, `support`, `cron-digest`. Each lands with README + test (#6).
5. **`registry.agentskit.io`**: gallery reading `meta.json`, shared design
   system, AKOS CTAs.
6. **Wire cross-links** across all four properties per the table above.
7. **Announce**: each seed agent = a demo post; registry = its own launch.

## Consequences

### Positive

- Closes the "last mile" gap; ready agents become the adoption on-ramp.
- Real downloads driven by genuine use; honest growth (no vanity inflation).
- Framework monorepo stays pure and contract-stable.
- Four properties become one funnel; OSS feeds AKOS; playbook lends authority.
- Maximal zero-lock-in: users own copied agent code.

### Negative

- A second repo + a fourth site to maintain and keep version-aligned.
- Cohesion layer adds a shared-UI dependency/contract across properties to keep in sync.

### Neutral

- Ready agents move to a lighter-governance world; the bar for "official" agent
  is curation + tests, not the full monorepo gate suite.
- `@agentskit/agents` (option A) is explicitly deferred; it may still be earned
  later if a real second consumer needs the agents as an importable package.

## Addendum (2026-06-10) — gallery hosting

The gallery was originally specced as its own static site on `registry.agentskit.io`.
It now lives **inside the docs site** (fumadocs/Next) at `agentskit.io/agents`
(list) and `/agents/[id]` (per-agent pages). The agent **source** stays in the
decoupled `agentskit-registry` repo; only the gallery UI unifies — one site, one
deploy, better SEO, free per-agent pages.

Data is served from the registry repo's **committed** built index (`public/r`,
via raw GitHub / jsDelivr) and fetched server-side with `revalidate`, so new
agents appear without a docs rebuild. The CLI reads the same committed index.
`registry.agentskit.io` becomes a redirect to `/agents` (or is dropped). No
separate Vercel project for the registry is required.
