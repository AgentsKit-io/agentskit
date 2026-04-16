# Phase 0 — Execution Plan (P0 → P2)

> Tactical plan for the 12 top-priority Phase 0 tasks. Covers 3–4 weeks.
> Linked to the [Phase 0 PRD #211](https://github.com/EmersonBraun/agentskit/issues/211).

---

## Sprint Overview

| Sprint | Duration | Goal | Deliverables |
|---|---|---|---|
| **Sprint 1** (P0) | 5 business days | Narrative + infra foundation | README, Manifesto, Origin, DNS, bundle/coverage gates, first ADRs |
| **Sprint 2** (P1) | 5–7 business days | Formalized contracts + docs migration | 6 complete ADRs, Fumadocs migrated, Concepts section |
| **Sprint 3** (P2) | 5–7 business days | External polish + quality | Rewritten READMEs for the 14 packages, Vercel AI migration guide, Playwright E2E |

**Gate to start Phase 1**: all P0+P1 done + ≥80% of P2.

---

## Sprint 1 — P0 (Week 1)

### Day 1 — Base narrative (low effort, high visibility)

**Morning — #14 MANIFESTO.md** (2–3h)
- Create `MANIFESTO.md` at the root
- 5–7 non-negotiable principles, 1 paragraph each:
  1. Core < 10KB gzip, zero deps (eternal stability)
  2. Plug-and-play: every package works on its own
  3. Radical interop: arbitrary combination = zero friction
  4. Zero lock-in: leaving is `npm uninstall`
  5. Agent-first (not chat-first)
  6. Strict TypeScript, no `any`
  7. Docs are product, not an afterthought
- Link at the top of the README

**Afternoon — #15 ORIGIN.md** (2–3h)
- Create `ORIGIN.md` at the root
- 500–800 words, personal tone
- Suggested structure:
  - "On [date], I tried to build [X]. I found that…"
  - Concrete pain (not abstract): "LangChain was 200MB, Vercel AI SDK had no runtime, MCP had no UI"
  - Decision: "I created AgentsKit because…"
  - Vision: "My bet is JavaScript will be the language of agents because…"

### Day 2 — Domain live

**#24 Configure agentskit.io** (4–6h)
- Add `CNAME` in the repo pointing at the domain
- DNS:
  - `agentskit.io` → Vercel/Cloudflare Pages (future landing) OR temporary GitHub Pages
  - `docs.agentskit.io` → reserved for Fumadocs (Sprint 2)
- Automatic SSL via Cloudflare
- Redirect `emersonbraun.github.io/agentskit/*` → `agentskit.io/*` (preserve SEO)
- Update the README with the new domain
- Verify OG meta tags (title, description, image) pointing at the correct domain

### Days 3–4 — Root README rewrite

**#13 Rewritten root README** (2 days)
- New structure (inspired by Next.js, Vercel AI SDK, Bun):
  ```
  [Logo + emotional tagline — 1 line]
  [Badges: npm, bundle, license, future Discord]

  > One-liner pitch (25 words max)

  ## Why AgentsKit?
  [4 bullets with clear contrast]

  ## Quick Start (60 seconds)
  [Code ≤15 lines running streaming chat]

  ## Before / After
  [Vercel AI SDK vs AgentsKit code, side by side]

  ## When NOT to use AgentsKit
  [Honesty — 3 scenarios]

  ## Ecosystem
  [Mermaid diagram of the packages]

  ## Links
  [Docs, Manifesto, Origin, Discord, Twitter]
  ```
- Validate by reading it aloud — it must hit under 90 seconds of reading

### Day 5 — CI gates (unlocks future quality)

**Morning — #6 Bundle-size budget** (3–4h)
- Install `size-limit` + the gzip plugin
- Create `.size-limit.json` at the root with one entry per package:
  ```json
  [
    { "path": "packages/core/dist/index.js", "limit": "10 KB" },
    { "path": "packages/adapters/dist/index.js", "limit": "20 KB" }
  ]
  ```
- Workflow `.github/workflows/size.yml` running on every PR
- Block merge on overrun

**Afternoon — #7 Coverage gate** (2–3h)
- Configure `vitest --coverage` with a per-package threshold
- Minimums: core 85%, adapters 70%, others 60%
- Publish a badge + report via Codecov or CodeClimate (free for OSS)
- The workflow fails if the threshold isn't met

---

## Sprint 2 — P1 (Weeks 2–3)

### Formalized contracts — 6 ADRs

**#3 Core contract ADRs** (5–7 days, 1 ADR/day)

Create folder `docs/architecture/adrs/`. Standard ADR template:

```markdown
# ADR 000N — <Contract>

## Status: Accepted | Proposed | Superseded
## Date: YYYY-MM-DD
## Context
## Decision
## Contract Interface (TypeScript)
## Rationale
## Consequences (positive / negative)
## Open Questions
```

Suggested order (most stable to most volatile):
- `0001-adapter-contract.md` — `Adapter`, streaming, tool calling
- `0002-tool-contract.md` — `Tool` schema, execute, validation
- `0003-memory-contract.md` — `Memory`, read/write, serialization
- `0004-retriever-contract.md` — `Retriever`, query, scoring
- `0005-skill-contract.md` — `Skill` manifest, prompt, examples
- `0006-runtime-contract.md` — `Runtime`, loop, lifecycle hooks

Each ADR ships as a separate PR → forces discussion.

### Fumadocs migration

**#25 Docusaurus → Fumadocs migration** (5–7 days)

Plan:
1. **Day 1**: Technical spike — Fumadocs scaffolding in branch `docs-fumadocs`, port the index
2. **Days 2–3**: Migrate content from the 12 existing sections (`adapters`, `agents`, `chat-uis`, `components`, `data-layer`, `examples`, `getting-started`, `hooks`, `infrastructure`, `packages`, `theming`, `contributing`)
3. **Day 4**: Decide the i18n strategy (Crowdin? freeze? LLM?) — short RFC
4. **Day 5**: Redirects, sidebar, custom theme (palette + typography aligned to the Manifesto)
5. **Day 6**: Deploy at `docs.agentskit.io` via Vercel
6. **Day 7**: Publish, archive the old Docusaurus

### Concepts Section

**#26 Concepts section** (2–3 days)
- Create under `docs/concepts/`:
  - `mental-model.mdx` — single diagram showing Agent ↔ Adapter ↔ Tool ↔ Memory ↔ Skill
  - `agent.mdx` — what an Agent is
  - `adapter.mdx` — provider abstraction
  - `tool.mdx` — executable function
  - `skill.mdx` — prompt + behavior + examples
  - `memory.mdx` — persistence
  - `react-loop.mdx` — how ReAct works in AgentsKit
  - `streaming.mdx` — the unified streaming model
- Consistent language (the glossary lives here)
- Each concept ≤600 words + minimal example + "when to use" / "when not to use"

---

## Sprint 3 — P2 (Weeks 3–4)

### READMEs for the 14 packages

**#17 Rewrite of every README** (2–3 days, parallelizable)

Standard structure per package:
```
# @agentskit/<name>
> <unique tagline — 1 line, emotion + function>

<2–3 line pitch>

## Install
## When to use this
## When NOT to use this
## Quick example (≤10 lines)
## Contracts this implements
## Stability: stable | beta | experimental
## Links: Docs | Changelog | ADR
```

Suggested taglines:
- `@agentskit/core` — *"The 10KB soul of every AgentsKit app"*
- `@agentskit/runtime` — *"Agents that survive crashes"*
- `@agentskit/adapters` — *"Swap providers in one line"*
- `@agentskit/react` — *"Chat streaming in 10 lines"*
- `@agentskit/ink` — *"Agents in your terminal, no compromise"*
- `@agentskit/memory` — *"Remember everything, forget on your terms"*
- `@agentskit/rag` — *"RAG without the plumbing"*
- `@agentskit/tools` — *"Every tool, one contract"*
- `@agentskit/skills` — *"Behavior as a first-class primitive"*
- `@agentskit/sandbox` — *"Run untrusted code, sleep at night"*
- `@agentskit/observability` — *"See inside every agent decision"*
- `@agentskit/eval` — *"Know if your agent actually works"*
- `@agentskit/cli` — *"From idea to agent in 60 seconds"*
- `@agentskit/templates` — *"Start with something real"*

### Vercel AI SDK migration guide

**#30 Migration guide** (2 days)
- Doc at `docs/migrating/vercel-ai-sdk.mdx`
- Structure:
  1. TL;DR (5 lines)
  2. Equivalence table (`streamText` → ?, `useChat` → ?, `tool()` → ?)
  3. 5 side-by-side migration examples (basic chat, tool calling, streaming, multi-modal, RAG)
  4. What AgentsKit adds that Vercel AI doesn't have
  5. Cases where Vercel AI is better (honesty)
- Tweet-size summary for distribution

### Playwright E2E

**#40 E2E on the 4 examples** (2–3 days)
- Shared Playwright setup in `tests/e2e/`
- One test file per `apps/example-*`:
  - `example-react.spec.ts` — streaming chat + tool call + memory persisting
  - `example-ink.spec.ts` — use `ink-testing-library`
  - `example-runtime.spec.ts` — full agent loop with replay
  - `example-multi-agent.spec.ts` — delegation working
- Workflow `.github/workflows/e2e.yml` running on PR and main
- Deterministic adapter fixture to avoid flakiness

---

## Tracking

### Definition of Done per task

Every P0–P2 issue is "done" when:
- [ ] Code/content implemented
- [ ] Tests added/updated (if applicable)
- [ ] Changeset created (if applicable)
- [ ] PR reviewed and merged
- [ ] Docs updated (if it affects the API)
- [ ] Item marked on the Project board

### Weekly checkpoint

Every Friday:
- Status of the P0–P2 issues (done / in-progress / blocked)
- Short demo of what shipped
- Priority adjustment for the next week

### Known risks

1. **Fumadocs migration may break i18n** — mitigation: keep Docusaurus alive in a branch until the new docs reach parity
2. **ADRs may turn into bikeshedding** — mitigation: 1-day time-box per ADR, merge and iterate later
3. **Bundle/coverage gates may block existing PRs** — mitigation: relaxed baseline at the start, tighten in 2 weeks
4. **A rewritten README may lose technical info** — mitigation: move details into the docs, the README is the entry point

---

## After Phase 0

When all gates in PRD #211 are green:
1. Announce publicly (HN + Twitter + Reddit + ProductHunt) — **single event**
2. Open the 20 Phase 1 issues (stories #1–20 from Master PRD #113)
3. Active Discord setup + first monthly newsletter
