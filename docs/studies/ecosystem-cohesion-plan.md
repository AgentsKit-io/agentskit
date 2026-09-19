# AgentsKit Ecosystem Cohesion Plan

**Status:** Superseded baseline · **Date:** 2026-06-10 · **Owner:** Emerson Braun

> Historical five-property study. The current seven-product identity contract is ADR 0021
> and `ecosystem.json`; the active documentation certification rollout is ADR 0023 and
> `docs/studies/ecosystem-documentation-quality-rollout.md`. Do not use the counts, URLs,
> or property list below as current product truth.

Unify the five AgentsKit-ecosystem web properties into one coherent surface:
shared identity, reciprocal cross-references, perfect SEO, machine-readable
`for-agents` docs + `llms.txt` everywhere, and a **single canonical source for
every number** so counts never drift again.

---

## 1. The five properties

| # | Property | Domain | Repo | Path | Stack | Role |
|---|----------|--------|------|------|-------|------|
| 1 | Main docs + landing | `agentskit.io` / `www.agentskit.io` | `agentskit` (local `lib`) | `apps/docs-next`, `apps/landing` | Next 16 + fumadocs 16 + Tailwind 4 | Hub. Library docs. |
| 3 | Agents Playbook | `playbook.agentskit.io` | `agents-playbook` | root app | Next 15 + fumadocs 15 + Tailwind 4 | Best-practices / methodology. |
| 4 | Registry | `registry.agentskit.io` | `agentskit-registry` | static `public/` | Static HTML + Node build script | shadcn-style installable agents. |
| 5 | Personal | `emersonbraun.dev` | `eb-dev` (`NoxCode/eb-dev`) | `apps/website` | Next + Nx + Bun + Tailwind 4 + shadcn | Builder hub. References all. |

**Positioning sentence (shared everywhere):**
> Grab what you want from **AgentsKit** (`agentskit.io`), follow best practices
> in the **Playbook** (`playbook.agentskit.io`), drop in ready-made agents from
> the **Registry** (`registry.agentskit.io`), and run them in production on

*(Attribution to the builder lives on `emersonbraun.dev`, which links out to all
four; the four product sites carry no personal-attribution links back.)*

---

## 2. Audit — current state

### 2.1 The drift problem (this is why we're here)

Counts are hardcoded in copy and already **mutually contradictory**:

| Property | Hardcoded claims found | Reality |
|----------|------------------------|---------|
| `agentskit.io` | "19 packages" / "13+ packages" / "8 libraries"; "20+ native adapters" / "17 adapters" / "100+ more"; "5,000+ models"; "20+ / 20 integrations"; "9 skills"; "60+ recipes"; "7 frameworks"; "six contracts" | 25 pkg dirs, 36 adapter modules, 3 integration dirs — none derived |
| `playbook` | "6 pillars", "70+ patterns", "13 gate scripts", "6 phases" (in `page.tsx` **and** baked into OG image) | ~85 pattern files, 13 scripts — loosely accurate, not derived |
| `registry` | **none** — count derived live from `r/index.json` (45 agents) | ✅ correct model |
| `eb-dev` | "14 npm packages" (x2), "21 skills" (x4); package list itself fetched live from npm | npm fetch is correct; the 14/21 strings drift |

Two properties already do it right (registry derives from `index.json`; eb-dev
fetches npm live). The fix is to make **all** numbers derive from a manifest.

### 2.2 Identity — fully divergent

No shared brand package anywhere. Every property has its own accent, and two
have **internal** divergence:

| Property | Accent | Notes |
|----------|--------|-------|
| `agentskit.io` docs | GitHub green `#1a7f37` / `#2EA043` | `--ak-*` tokens in `global.css` |
| `agentskit.io` landing | Purple `#7c5cff` | **different palette from its own docs** |
| `playbook` | Violet `oklch(0.72 0.18 295)` | inline in `globals.css`, dark-only |
| `registry` | Blue `#6ea8fe` | inline `<style>` |
| `eb-dev` | Blue `hsl(217 91% 60%)` | shadcn vars |

Fonts are *roughly* aligned (Inter body + JetBrains Mono code almost
everywhere; lib adds Space Grotesk display). Logos are inconsistent: lib has
`Sparkles` icon and has **no favicon**; registry has no logo/favicon.

### 2.3 SEO maturity

|------------|:---:|:---:|:---:|:---:|:---:|
| Root metadata + title template | ✅ | ✅ | ✅ | partial | ✅ (no template) |
| Per-page canonical | ✅ | ❌ | ✅ | ❌ (1 page) | ❌ |
| Dynamic OG image | ✅ | static only | static only | ❌ | static `logo.png` |
| Sitemap | ✅ | ✅ | ✅ | ❌ | ⚠️ 3 URLs, `lastModified` frozen `2025-04-08` |
| robots + AI crawlers | ✅ explicit allowlist | ✅ basic | ✅ basic | ❌ | ✅ basic |
| JSON-LD | ✅ (Org/WebSite/Article/Breadcrumb) | ❌ | ✅ | ❌ | ⚠️ Person only |

`agentskit.io` is the reference implementation. Everything else has gaps.
canonicals/OG/sitemap point at the wrong domain unless the env var is set.

### 2.4 `for-agents` + `llms.txt`

| Property | `llms.txt` | `llms-full.txt` | `for-agents` |
|----------|:---:|:---:|:---:|
| agentskit.io | ✅ dynamic route | ✅ dynamic route | ✅ 24 MDX under `/docs/for-agents` |
| playbook | ✅ dynamic route + bundle.zip | ✅ dynamic route | ❌ (only referenced as a pattern in content) |
| registry | ❌ | ❌ | ⚠️ A2A AgentCard embedded per agent (closest thing) |
| eb-dev | ❌ | ❌ | ❌ |

**No `llms.txt` cross-links to any sibling site.** Each is self-referential.

### 2.5 Cross-references

Almost none, and non-reciprocal:

- `playbook`: links `www.agentskit.io` (hero/nav/footer); nothing else.

### 2.6 The ecosystem bar already exists — as a 404

`registry/public/index.html` loads:
```html
<script src="https://www.agentskit.io/ecosystem-bar.js" defer data-current="registry"></script>
```
**The file does not exist on `www.agentskit.io`.** Building + hosting it is step zero.

---

## 3. Target architecture

Four pillars. Each kills one class of drift.

```
┌─────────────────────────────────────────────────────────────┐
│  PILLAR A — Canonical Counts (build-time manifest + API)      │
│    each repo owns its numbers, exposes /api/stats.json,       │
│    consumers fetch at build, CI gate fails on hardcoded drift │
├─────────────────────────────────────────────────────────────┤
│  PILLAR B — Shared Identity (generated, copied per repo)      │
│    one canonical brand source → generator writes tokens into  │
│    each repo; logos, OG template, voice guide                 │
├─────────────────────────────────────────────────────────────┤
│  PILLAR C — Ecosystem Bar + Cross-reference mesh              │
│    ecosystem-bar.js hosted on agentskit.io, embedded in 5;    │
│    reciprocal contextual links; llms.txt ecosystem block      │
├─────────────────────────────────────────────────────────────┤
│  PILLAR D — SEO + for-agents + llms.txt parity                │
│    bring every property up to the agentskit.io reference bar  │
└─────────────────────────────────────────────────────────────┘
```

### Pillar A — Canonical counts (build-time manifest + API route)

**Rule:** a number about a thing lives in the repo that owns that thing. Every
other surface reads it. Nothing is hand-typed.

**Ownership map:**

| Number | Owner | Derived from |
|--------|-------|--------------|
| packages, framework bindings, native adapters, catalog providers/models, integrations, tools, skills, memory backends, recipes, core gzip size | `agentskit.io` (lib) | glob `packages/`, catalog data, `content/docs/**`, `size-limit` output |
| pillars, patterns, gate scripts, phases, templates | `playbook` | walk `content/docs/**` |
| registered agents | `registry` | `readdirSync(registry/)` → already in `r/index.json` |
| (none — pure consumer) | `eb-dev` | fetches the four above + npm |

**Per-repo contract — `/api/stats.json`** (static, cacheable, CORS `*`):

```jsonc
// https://www.agentskit.io/api/stats.json
{
  "schemaVersion": 1,
  "property": "agentskit",
  "generatedAt": "2026-06-10T00:00:00Z",
  "counts": {
    "packages": 25,
    "frameworkBindings": 7,
    "nativeAdapters": 36,
    "catalogProviders": 100,
    "catalogModels": 5000,
    "integrations": 3,
    "tools": 0,
    "skills": 9,
    "memoryBackends": 0,
    "recipes": 0
  },
  "coreSizeKbGzip": 9.4
}
```

- registry's existing `r/index.json` already *is* this endpoint (just add a
  thin `/api/stats.json` alias mapping `agents: index.agents.length`).
  `stats.json` from the same data and serve it from `apps/web/public`.

**Consumption (build-time, zero runtime fetch, no stale):**

A tiny shared module `lib/ecosystem-stats.ts` (copied per repo via the sync
script — no npm publish, per §6) fetched at **build** (in `generateStaticParams` /
RSC / a prebuild script), output baked into the static page. Fallback to a
committed `ecosystem-stats.snapshot.json` if a sibling is unreachable during
build, plus a CI warning. Pattern eb-dev already uses for npm.

**Drift gate — `scripts/check-count-drift.mjs`** (new, per repo, wired into
`check:quality-gates`):
- Greps copy/MDX/JSX/i18n strings for number-like tokens adjacent to owned
  nouns (`\d+\+?\s*(packages|adapters|models|...)`).
- Fails the build if a literal count doesn't match the manifest, **unless** the
  string is sourced from the stats module (allowlisted via a `data-stat` marker
  or an import).
- Mirrors the existing `check-for-agents-coverage` / baseline-ratchet style
  already in the repos.

**Net effect:** "19 packages" / "13+" / "8 libraries" become
`{stats.counts.packages} packages` everywhere; changing a package count updates
all five sites on next build; CI blocks any new hardcoded number.

### Pillar B — Shared identity (canonical source → generated copies)

You chose **copy tokens per repo** (not a runtime-shared package). To keep the
copies from drifting — which is the whole point — make them **generated, not
hand-copied**:

- **Canonical source:** `brand/` directory in `lib` (the hub):
  - `brand/tokens.json` — colors, fonts, radii, spacing, motion, elevation.
  - `brand/logo/*.svg` — mark + wordmark + favicon source.
  - `brand/og/` — shared OG image template + palette.
  - `brand/voice.md` — tone, naming, the positioning sentence, the do/don't list.
- **Generator:** `scripts/sync-brand.mjs` reads `tokens.json` and **writes** the
  per-repo artifact in the right format for each stack:
  - lib/landing/playbook/eb-dev → CSS custom properties block (Tailwind 4 `@theme`).
  - registry → inline `<style>` vars in `index.html`.
- **Distribution (locked §6):** **copy via script, no npm publish.** Each repo
  runs `sync-brand` in prebuild to (re)generate its committed copy from `lib`'s
  `brand/tokens.json`; a `check-brand-drift` gate fails if the committed copy
  differs from a fresh generate. → tokens are physically copied per repo but
  provably identical to source. No `@agentskit/brand` package.

**Identity (locked §6):**
- **One brand family, per-property accent.** Structure tokens
  (neutrals, surfaces, type scale, radii, logo, OG frame) are identical
  everywhere; each property keeps a distinct **accent hue** as a sub-brand:
  - core `agentskit.io` → green (the established `--ak-green`)
  - playbook → violet (its current identity)
  - registry → blue
  - eb-dev → personal blue (kept intentionally — it's *his* site, lightly tied)
  This unifies the system without flattening the recognisable sub-brands, and
- Standardise type: Inter (body) + JetBrains Mono (code) everywhere; Space
  Grotesk (display) optional per property.
- Give playbook a real logo + favicon.

### Pillar C — Ecosystem bar + cross-reference mesh

**C0 — Canonical property descriptions + no-invention rule.**

Each property is described once, in its own verified words. Cross-link anchor
text and ecosystem-bar labels draw **only** from these — never assert a feature
a property doesn't actually claim about itself.

| Property | Canonical one-liner (verbatim/verified) | What it IS — and is NOT |
|----------|------------------------------------------|--------------------------|
| `agentskit.io` | "The most complete agent toolkit for JavaScript." | Open-source library/SDK to build agents in code. |
| `playbook` | "Best practices for building production AI agents." | Methodology — 6 pillars, patterns, gate scripts. Guidance, not code. |
| `registry` | "Ready-to-use AI agents." | shadcn-style installable agents (`npx agentskit add`). |
| `emersonbraun.dev` | (personal/builder site) | Link-**source** only; not a cross-link target. |

(scheduler, trace viewer, SSO, edge, "deploy your agent here") unless that exact
concise, accurate, no fabrication. The relationship is "AgentsKit = the library
embellished.

**C1 — Build & host `ecosystem-bar.js`** (step zero — it's already referenced):
- Self-contained vanilla JS, no deps, < 4 KB, served from `www.agentskit.io`
  (locked §6: `docs-next` `public/`).
  highlight the active property.
- Renders a slim top strip: the five properties + GitHub + npm. Styled from the
  shared brand tokens (CSS injected, respects `prefers-color-scheme`).
- Optional: fetch each property's `/api/stats.json` to show live counts in the
  bar (progressive, non-blocking).
- A11y: `role="navigation"`, keyboard-navigable, `aria-current` on active.
- Embed snippet (already live in registry; add to the other four):
  ```html
  <script src="https://www.agentskit.io/ecosystem-bar.js" defer data-current="…"></script>
  ```
  - **SRI tradeoff:** the script is first-party and intentionally mutable
    (update once → propagate to all five), so a pinned `integrity=` hash is
    *not* used — it would defeat the auto-propagate goal. Mitigate instead with
    a strict `Content-Security-Policy` (`script-src` allowlisting only
    `www.agentskit.io`) on each consumer, and treat the bar as trusted
    first-party code in review. Revisit SRI only if the bar moves to a 3rd-party CDN.

**C2 — Reciprocal contextual links** (cross-reference *where it helps, never forced*):

| From → To | Where | Example |
|-----------|-------|---------|
| agentskit.io → playbook | docs footer + relevant guide pages | "Building production agents? See the Playbook's security pillar." |
| agentskit.io → registry | get-started + tools/skills docs | "Don't build from scratch — install a ready-made agent." |
| playbook → agentskit.io | pattern pages | "Reference implementation of this pattern: `@agentskit/runtime`." |
| playbook → registry | templates/examples | "Install a conforming agent." |
| registry → agentskit.io / playbook | gallery page (not just README) | "How to use" → docs; "Best practices" → playbook. |

**Direction rule:** the mesh is **reciprocal among the 4 AgentsKit product
**link-source only** — it links out to the four (its projects section already
does), but the four do **not** carry "built by Emerson" attribution links back.
No personal-attribution rows anywhere in the product sites.

**C3 — `llms.txt` ecosystem block:** every property's `llms.txt` header gets a
shared, generated block listing the other four + their `llms.txt` URLs, so any
agent crawling one discovers all five. Generated from a single
`ecosystem.json` manifest (the registry of properties) copied per repo.

### Pillar D — SEO + for-agents + llms.txt parity

Bring every property to the `agentskit.io` reference bar.

**Per-property work:**

  add JSON-LD (Org/WebSite/SoftwareApplication + per-doc TechArticle/Breadcrumb);
  add dynamic OG route (reconcile the `#2997ff`/`#34d399` palette split);
  **serve `llms.txt` from `apps/web`** (currently repo-root only) + add
  `llms-full.txt`; keep the for-agents coverage gate.
- **playbook:** add a `/docs/for-agents` summary (or at least a `for-agents`
  index) — it currently only *teaches* the pattern; per-page OG; add logo +
  favicon; derive the homepage counts from its own `/api/stats.json`.
- **registry:** biggest SEO gap — add `sitemap.xml`, `robots.txt` (with AI
  crawler allowlist), per-agent HTML pages (or pre-rendered) with canonical +
  OG + JSON-LD `SoftwareApplication`/`HowTo`; add `llms.txt` + `llms-full.txt`
  generated from `r/index.json`; add `for-agents` (it already has A2A cards —
  expose them as a discovery doc).
- **eb-dev:** add `llms.txt` + a `for-agents`/`/about-the-builder` doc (who
  Emerson is, what he ships, links to the ecosystem); fix sitemap
  (`lastModified` is frozen at `2025-04-08`, only 3 URLs); per-page canonical;
  expand JSON-LD beyond Person; replace hardcoded "14 packages"/"21 skills" with
  fetched stats.
- **agentskit.io:** add sibling links to `llms.txt`/`llms-full.txt`; add
  `generateMetadata`/canonical to `showcase/[slug]`; give `landing` a
  `sitemap.ts` + `robots.ts` + JSON-LD (currently bare); unify landing palette
  with docs.

**Shared SEO baseline (gate per repo):** title template, per-page canonical,
dynamic OG, sitemap with real `lastModified`, robots + AI-crawler allowlist,
JSON-LD (Org + WebSite + per-page Article/Breadcrumb), correct `metadataBase`,
`llms.txt` + `llms-full.txt` + ecosystem block, `for-agents` entry point.

---

## 4. Single source-of-truth artifacts (the canonical registries)

Three small manifests, each owned once, copied/generated outward:

1. **`ecosystem.json`** — the five properties (name, domain, repo, tagline,
   `llms.txt` URL, accent). Drives the ecosystem bar, cross-links, llms.txt
   block. Owned in `lib`, copied per repo.
2. **`brand/tokens.json`** — identity (Pillar B). Owned in `lib`.
3. **`/api/stats.json` per repo** — counts (Pillar A). Owned per repo, consumed
   everywhere.

---

## 5. Phased execution

Plan-only for now; phases are the build order once approved.

**Phase 0 — Foundations (in `lib`, the hub)**
- `ecosystem.json`, `brand/tokens.json`, `brand/sync-brand.mjs`.
- Build + host `ecosystem-bar.js` on `www.agentskit.io` (unblocks registry's 404).
- `agentskit.io` `/api/stats.json` (the most-referenced numbers).
- `ecosystem-stats.ts` consumer module + snapshot fallback.

**Phase 1 — Counts everywhere**
- Replace every hardcoded count with stats reads across all five.
- `check-count-drift.mjs` gate per repo.

**Phase 2 — Identity rollout**
  playbook logo/favicon; `check-brand-drift` gate.

**Phase 3 — Cross-reference mesh**
- Embed ecosystem bar in the other four.
- Reciprocal contextual links — implement from the **full page-by-page map in
  Appendix A** (C2). Reciprocal among the 4 product sites; eb-dev links out only.
- `llms.txt` ecosystem block (C3) generated everywhere.

**Phase 4 — SEO + for-agents parity**
- Per-property SEO/for-agents/llms.txt work from §Pillar D.
- Shared SEO baseline gate.

**Phase 4.5 — Landing-page design uplift**
- Critique + raise each landing/marketing surface to a high bar (hero,
  conversion, hierarchy, polish) using the design skills — not just cross-linked
  homepage, playbook homepage, registry gallery. (eb-dev keeps its own look.)
- Driven by the shared brand tokens (Phase 2) so uplift stays on-system.

**Phase 5 — Verify**
- Lighthouse/SEO check per property; validate JSON-LD; confirm all `llms.txt`
  cross-link; confirm no drift gate failures; submit sitemaps to GSC; ping
  IndexNow (lib already has `ping-indexnow`).

---

## 6. Decisions — LOCKED (2026-06-10)

1. **Brand palette** — ✅ **One family, per-property accent.** Structure, type,
   logo, OG frame identical everywhere; each property keeps its accent hue
2. **`www.agentskit.io` host** — ✅ **`docs-next`.** The ecosystem bar and the
   global `/api/stats.json` live in `apps/docs-next/public` / its API, co-located
   with the real source of the package/adapter/model numbers. (Confirm Vercel
   domain mapping: `www` + apex → `docs-next` project during Phase 0.)
3. **Brand/ecosystem distribution** — ✅ **Copy via script, no npm publish.**
   `sync-brand.mjs` + `sync-ecosystem.mjs` generate the copied files per repo;
   `check-brand-drift` / `check-ecosystem-drift` gates prove the copies match
   the canonical source in `lib`. No `@agentskit/brand` package.
4. **eb-dev coupling depth** — ✅ **Lightly linked, link-source only.** It
   features/links the 4 products (its projects section already does), keeps its
   own personal visual look (own accent, own layout), not subject to the
   shared-token gate. **The 4 product sites carry NO "built by Emerson"
   attribution links back** — no personal references on the product surfaces
   (user decision 2026-06-10). Ecosystem bar on eb-dev is optional, not required.

### Still open (Phase-4 detail, not a blocker)

5. **Registry per-agent pages** — add pre-rendered HTML pages per agent for SEO
   (bigger lift, much better discoverability), or keep JSON-only + a single
   gallery page? Decide when Phase 4 reaches registry.

---

## Appendix A — Exhaustive internal cross-reference map

Page-by-page link targets, only where natural (no forcing). Implements C2.
Reciprocal among the 4 product sites. **No personal-attribution rows** — eb-dev
links out to the products (table A.5), the products do not link back to eb-dev.

### A.1 agentskit.io (main docs + landing)

| Page/group | Link → | Anchor idea | Rationale |
|---|---|---|---|
| Home / landing | registry | "Browse ready-to-install agents" | Fastest way to see working agents without code. |
| Home / landing | playbook | "See the 6-pillar methodology" | Six contracts map to the six pillars. |
| Get started: quickstart / build-first-agent | registry | "Start from a pre-built agent" | Scaffold instantly vs build from scratch. |
| Get started: architecture-at-a-glance | playbook | "Playbook: architecture pillar" | Methodology + gate scripts for structuring layers. |
| Get started: decision-tree | registry | "Or start from a registry agent" | When the answer is "just give me a working agent." |
| Get started: comparison | none | — | Pure competitor matrix. |
| Get started: migrating/* | none | — | Self-contained per-framework how-tos. |
| Get started: concepts (contracts) | playbook | "Playbook: ai-collaboration pillar" | How to reason about each contract's owner. |
| Agents: skills/marketplace + individual skills | registry | "Install the `[skill]` from the registry" | Registry is the hosted impl of `createSkillRegistry`. |
| Agents: tools/integrations | playbook | "Governance pillar: tool authorization" | Each connector → approval/quota/least-privilege. |
| Agents: delegation + topologies | playbook | "Architecture pillar: topology patterns" | Supervisor/swarm/hierarchical/blackboard. |
| Agents: hitl / guarantees | playbook | "Governance pillar: approval/quota gates" | Core governance primitives. |
| Agents: self-debug / speculate | playbook | "Quality pillar: self-healing/eval patterns" | Test/eval/retry loops. |
| Data: providers/choosing | playbook | "Playbook: choosing a provider" | Decision framework → team-repeatable rules. |
| Data: providers/local, bridges, memory/* | none | — | Infra-specific; no sibling maps on. |
| Data: rag/* | registry | "Install a RAG-ready agent" | Pre-wired RAG starters. |
| Production: security/* | playbook | "Security pillar: production guardrails" | PII/injection/rate-limit/sandbox sections. |
| Production: evals/* | playbook | "Quality pillar: eval-driven development" | Methodology governing eval suites in CI. |
| Production: runbooks | playbook | "Playbook: on-call patterns" | Outage/cost/injection/flapping patterns. |
| Production: embedded | registry | "Install an embedded-ready agent" | Concrete agent to embed. |
| UI: bindings + theming + tool-call-view | playbook | "UI-UX pillar: chat/theming/confirmation UX" | Binding choice, tokens, confirmation trust. |
| Reference: packages/overview | registry | "Or install a pre-wired agent" | Evaluator entry point. |
| Reference: recipes/* (marketplace, hitl, research-team, topologies, evals-ci) | registry / playbook | per-recipe | Each recipe → its registry counterpart or playbook pattern. |
| Reference: contribute / changelog / for-agents/* | none | — | Community/version/LLM-machine surfaces. |
| Compare | registry | "Try without the comparison — install an agent" | Lowest-friction trial. |
| Use cases: support / research / code / rag-app | registry | "Install the `[type]` agent" | Each maps to a registry agent. |
| Showcase / Stack builder / Learn | registry | "Install as a registry agent / skip the builder" | Install path for what they see. |
| Evals | playbook | "Quality pillar: interpreting eval results" | Use scores to gate promotions. |
| Blog: launch post | playbook | "The methodology behind AgentsKit" | Six contracts → team practice. |


The single highest-value link across the whole site: **Docs → Concepts/Architecture → agentskit.io** ("AgentsKit repository" — the page names `@agentskit/*` packages explicitly).

| Page/section | Link → | Anchor idea | Rationale |
|---|---|---|---|
| Home — hero | agentskit.io | "built on AgentsKit" | Credits the OSS runtime; keeps claim credible. |
| Home — architecture (CLI/Desktop/Web) | agentskit.io | "agentskit-os CLI" | CLI surface = the `agentskit-os` npm package. |
| Home — migration section | playbook | "migration playbook" | The *how to migrate well* next step. |
| Home — features: agents / knowledge tiles | agentskit.io | "AgentsKit LLM adapters / RAG primitives" | Adapters + RAG come from OSS upstream; proof, no lock-in. |
| Home — stack section ("30+ providers") | agentskit.io | "see all adapters" | Avoids maintaining a duplicate provider list (drift!). |
| Home — personas/industries | playbook | "industry playbooks" | Where genuinely available. |
| Home — footer Resources | agentskit.io + registry | "Open-source library" / "Agent registry" | Obvious dev resources currently missing. |
| Docs — Concepts/Architecture | agentskit.io | "AgentsKit repository" | Names `@agentskit/*` directly — highest-value link. |
| Docs — Concepts/Agents (30+ adapters) | agentskit.io | "AgentsKit adapters" | Which providers supported. |
| Docs — Concepts/Flows (`os-flow`, `os-core`) | agentskit.io | "os-flow / os-core packages" | Cited package names → upstream repo. |
| Docs — Concepts/Triggers (`os-triggers`) | agentskit.io | "os-triggers package" | Schema/type details. |
| Docs — Concepts/Processes | playbook | "multi-phase process patterns" | Real-world sequencing. |
| Docs — CLI/Migrating | playbook | "migration planning guide" | Before/after the import. |
| Docs — CLI/Command Reference | agentskit.io | "AgentsKit CLI npm package" | Verify package name/version. |
| Docs — Using app/Connections, Tools(MCP), Knowledge, Observability | agentskit.io | per-feature package | Provider list/MCP bridge/RAG/observability all `@agentskit/*`. |
| Docs — Using app/Templates & Marketplace, Agents preset gallery | registry | "Browse the agent registry" | Public catalogue vs in-app selection. |
| Docs — Using app/Evals, Governance | playbook | "eval strategy / governance posture guide" | Mechanics → when/how methodology. |
| Docs — How it works/Run Lifecycle | agentskit.io | "os-runtime" | Sidecar = OSS package. |
| In-app — Marketplace + Agents empty state | registry | "Public agent registry →" | Highest-intent moment → path to value. |

### A.3 playbook.agentskit.io

Richest source of "reference implementation on agentskit.io" links — nearly every pattern maps to a concrete package. Condensed (full per-pattern list in the audit):

| Page group | Link → | Anchor idea | Rationale |
|---|---|---|---|
| pillars/architecture/error-hierarchy | agentskit.io | "`AgentsKitError` in `@agentskit/core`" | Pattern implemented verbatim in `core/src/errors.ts`. |
| pillars/architecture/contracts-zod, ts-concrete, anti-overengineering, event-streaming, feature-flags | agentskit.io | `defineTool` / monorepo topology / core / event bus / `createPromptExperiment` | Each is a living example in the agentskit repo. |
| pillars/architecture/adr + rfc + tombstone + pr-intent + merge-rules | agentskit.io/rfcs | "AgentsKit's RFC log / CONTRIBUTING / GOVERNANCE" | Real governance artifacts. |
| pillars/ai-collaboration/* (memory, hitl, sub-agent, concurrent, tool-design, prompt-versioning, context-mgmt, hallucination, self-describe, slash-commands, bootstrap-doc) | agentskit.io (+ registry on hitl, tool-design) | `@agentskit/memory`, `createApprovalGate`, runtime topologies, `createPromptExperiment`, `@agentskit/rag`, `AgentSchema`/`a2a`, `CLAUDE.md`/`AGENTS.md` | Each pattern → exact core/runtime/memory/rag export. |
| templates/* (CLAUDE.md, AGENTS.md, ADR, MEMORY.md) | agentskit.io (+ /rfcs, /docs/memory) | "AgentsKit's own filled-in example" | Repo ships real filled versions. |
| prompts/* (subagents, architect) | agentskit.io/docs/runtime | "orchestrate with runtime topologies / AgentSchema" | Prompts describe what runtime implements. |

### A.4 registry.agentskit.io

| Page/section | Link → | Anchor idea | Rationale |
|---|---|---|---|
| Gallery — subtitle / install strip | agentskit.io | "Learn how AgentsKit works → / New to AgentsKit? Start here" | Context before adding an agent; prevents drop-off. |
| Gallery — install strip | playbook | "Best practices for agent pipelines →" | "Now what?" destination. |
| Per-agent card — packages list (JS render loop) | agentskit.io/docs/packages/{pkg} | "@agentskit/{pkg} docs" | `core`+`runtime` on all 45 → each card a teaching moment; scales automatically. |
| Per-agent card — by category | playbook | "See patterns for this agent type →" | `playbook/.../patterns/{category}` if per-category anchors exist. |

### A.5 emersonbraun.dev (link-source only — links OUT to the 4)

| Page/section | Link → | Anchor idea | Rationale |
|---|---|---|---|
| Projects `SUPPORTING_PROJECTS` array | registry + playbook | add "AgentsKit Registry" + "AgentsKit Playbook" cards | Distinct enough to deserve their own cards. |
| Package ecosystem grid (cards → npm today) | agentskit.io/docs/packages/{pkg} | secondary "Docs →" link | npm = install, docs = architecture; different intents. |
| Hero second CTA ("playbook" label → `/newsletter` today) | playbook | "Read the agent playbook" | Label says playbook but links newsletter — fix destination or split. |
| Footer Quick Links + bio | registry + playbook | add "Registry" + "Playbook" entries | Bio names only AgentsKit; other 3 get zero attribution. |
| /newsletter thank-you QuickActions | agentskit.io + registry | "Explore AgentsKit / Browse the registry" cards | High-intent post-subscribe moment, currently absent. |
