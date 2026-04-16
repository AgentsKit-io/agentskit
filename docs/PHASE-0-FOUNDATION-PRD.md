# AgentsKit — Phase 0: Foundation Hardening PRD

> Pre-roadmap. Before executing the 97 Master PRD issues (#113), solidify technical bases, narrative, and public infrastructure. 4–6 weeks of focused work.
>
> **Decisions already made:**
> - Migration from **Docusaurus → Fumadocs** (Next.js-native, rich MDX, modern look, ideal for a JS library)
> - Own domain **agentskit.io** (already acquired) replacing `emersonbraun.github.io/agentskit`

---

## Problem Statement

AgentsKit has 14 functional packages, CI, changesets, Docusaurus with i18n in 3 languages, and a Master PRD with 97 user stories roadmap-ed. But executing that roadmap on the current base will create technical debt and inconsistency because:

- **Contracts are not formally versioned** (Adapter, Tool, Memory, Retriever). 10 new adapters diverging on subtleties break the "plug-and-play" promise.
- **No stability tiers** — external developers don't know which packages are safe to adopt.
- **Bundle-size budget is not enforced in CI** — the core <10KB promise can be silently broken.
- **External narrative is technical and generic** — "complete toolkit for AI agents" doesn't sell a revolutionary product; there's no manifesto, origin story, strong visual identity, or honest comparison including when NOT to use.
- **Documentation is broad and shallow** — 12 Docusaurus sections with no "Concepts" section, no deep Recipes/Cookbook, no troubleshooting, no migration guides from LangChain/Vercel AI.
- **READMEs of the 14 packages are uniformly generic (~50 lines)** — each package is a product and needs its own pitch.
- **Docusaurus is an un-decided default** — a better alternative exists (Fumadocs) for the Next/React ecosystem. Already decided to migrate.
- **Weak domain** (`emersonbraun.github.io/agentskit`) hurts positioning. `agentskit.io` already acquired.
- **Immature governance** — no CODEOWNERS, no Discord, no plural maintainers, no RFC process, no specific issue/PR templates.
- **Legal / business gaps** — MIT license is fine for OSS but ambiguous for a future Cloud offering; trademark not registered; analytics missing from the docs.

## Solution

Execute **Phase 0 — Foundation Hardening** across 4 parallel tracks before starting Phase 1 of the Master PRD:

1. **Contracts & technical governance** — ADRs, stability tiers, CI gates, RFC process.
2. **Narrative & identity** — manifesto, origin story, minimum visual identity, independent landing at `agentskit.io`, per-package READMEs with their own pitch.
3. **Deep documentation** — migration to **Fumadocs**, Concepts section, Recipes cookbook, troubleshooting/FAQ, LangChain and Vercel AI migration guides, linked examples.
4. **Quality & community infrastructure** — coverage/bundle gates, E2E for examples, CODEOWNERS, Discord, analytics, sponsors.

Expected outcome: at the end of Phase 0, the project is **ready to 10x without debt**, with a narrative that "sells itself" and a technical base that supports 97 issues without chaos.

---

## User Stories

### Track 1 — Contracts & Technical Governance

1. As a maintainer, I want a **root ARCHITECTURE.md** explaining founding decisions (zero-deps core, independent packages, why not LangChain-style) to align contributors.
2. As a maintainer, I want an **open RFC process** with a template (`.github/RFC-TEMPLATE.md` + `rfcs/` folder), so technical proposals are discussed before becoming code.
3. As an external developer, I want a **versioned ADR per core contract** (Adapter, Tool, Memory, Retriever, Skill, Runtime), so I can adopt without fear of silent breaking changes.
4. As a developer, I want **documented stability tiers** (stable / beta / experimental) in each `package.json` and README, so I know what I can use in production.
5. As a maintainer, I want a **written semver policy** — what counts as breaking vs patch, when to bump major — so I can apply it consistently.
6. As a maintainer, I want a **bundle-size budget enforced in CI** (e.g. `size-limit` or `bundlewatch`) blocking PRs that break core <10KB, adapters <20KB, etc.
7. As a maintainer, I want a **coverage gate in CI** (minimum 70% per package, 85% on core), so test regressions are blocked.
8. As a maintainer, I want **changeset linting** blocking any PR that doesn't declare a version change.
9. As a maintainer, I want **per-package CONVENTIONS.md** (`packages/adapters/CONVENTIONS.md`, etc.) describing how to add a new adapter/tool/skill — step by step.
10. As a maintainer, I want a **visual dependency diagram** between packages (Mermaid in ARCHITECTURE.md) updated automatically.
11. As a maintainer, I want **CODEOWNERS** configured per package for review auto-assign.
12. As a maintainer, I want **issue templates** (bug, feature request, RFC, docs) and a **PR template** enforcing a checklist (tests, changeset, docs).

### Track 2 — Narrative & Identity

13. As a visitor, I want a **rewritten root README** with: emotional tagline, summarized origin story, a "before/after" code block, honest comparison (including when NOT to use), quickstart ≤15 lines, link to agentskit.io.
14. As a technical reader, I want a public **MANIFESTO.md** (core <10KB, plug-and-play, zero lock-in, agent-first, radical interop) explaining non-negotiable principles.
15. As a visitor, I want an **ORIGIN.md** — why AgentsKit exists, what pain the author felt, JS-agent ecosystem context — to create human connection.
16. As an evaluating developer, I want to see an **honest comparison table** on the home page vs Vercel AI SDK, LangChain.js, Mastra, assistant-ui — including points where the others win.
17. As a developer, I want a **dedicated pitch in each package README** (`@agentskit/core — the 10KB soul`, `@agentskit/runtime — agents that survive crashes`, etc.) replacing the current generic READMEs.
18. As a visitor, I want a **minimum visual identity**: logo, favicon, 3–5 color palette, chosen typography, social card (OG image), customized Fumadocs theme.
19. As a visitor, I want to access **agentskit.io** with an independent landing page (Next.js) separate from the documentation — different audiences (marketing vs technical reference).
20. As a developer discovering the library, I want a **60-second video** embedded on the home page showing "zero → streaming chat in 10 lines" visually.
21. As a visitor, I want to see **social proof** on the landing (GitHub stars, npm downloads, "used by", testimonials when available, showcase).
22. As a maintainer, I want an **official X/Twitter account** (`@agentskit` or `@agentskitdev`) active with weekly tips, changelog, release notes.
23. As a developer, I want a **public changelog with narrative** (not only a technical CHANGELOG.md) — "This month we shipped X, learned Y" — as a monthly blog/newsletter.
24. As a visitor, I want **agentskit.io configured** with DNS, SSL, and redirects from the old GitHub Pages.

### Track 3 — Deep Documentation (Fumadocs migration)

25. As a maintainer, I want to **migrate `apps/docs` from Docusaurus to Fumadocs** (Next.js 15, MDX, modern theme), preserving existing content.
26. As a developer, I want a new **"Concepts" section** explaining the mental model (Agent, Adapter, Skill, Tool, Memory, ReAct, Streaming) with a single diagram and consistent language — before the API reference.
27. As a developer, I want a 5-question **"Decision Tree"** ("Using React? Want terminal? Need RAG?") that tells me which combination of packages to install.
28. As a new developer, I want a **3-minute Quickstart** that delivers a working chat with streaming, a tool call, and basic memory.
29. As a developer, I want a **"Recipes" / Cookbook section** with ≥10 short, complete recipes (Chat with RAG in 30 lines; Agent that reads Gmail; Discord bot; PDF Q&A; Code reviewer; Multi-agent; etc.), each with a Stackblitz link.
30. As a developer, I want a **Vercel AI SDK → AgentsKit Migration Guide** with side-by-side code diffs.
31. As a developer, I want a **LangChain.js → AgentsKit Migration Guide** with side-by-side code diffs.
32. As a developer, I want a **"Troubleshooting / FAQ" section** solving the 20 most common errors/questions.
33. As a developer, I want **examples in `apps/example-*` linked from the docs** with "Edit on Stackblitz" and screenshots.
34. As a developer, I want a **TypeDoc-generated API reference** embedded inside Fumadocs, typed and always up to date.
35. As a developer in another language, I want a **clear i18n strategy** in Fumadocs: either keep pt-BR/es/zh-Hans with automated translation (Crowdin/LLM) or freeze until EN stabilizes — decision documented.
36. As a developer, I want a **Glossary** (ReAct, Tool Calling, RAG, Embedding, Adapter, Skill) linked inline in the docs.
37. As a maintainer, I want **docs versioning** (v0.x, v1.x) native to Fumadocs so links don't break when bumping major.
38. As a visitor, I want **fast full-text search** (Algolia DocSearch free for OSS or Fumadocs built-in).
39. As a maintainer, I want **PostHog/Plausible analytics** on docs + landing to understand which pages convert and where developers leave.

### Track 4 — Quality & Community

40. As a maintainer, I want **Playwright E2E** on the 4 `apps/example-*` running in CI, guaranteeing that real demos never break.
41. As a maintainer, I want **per-adapter contract tests** — one shared suite run against OpenAI, Anthropic, Gemini, Ollama — catching regressions when a provider changes its API.
42. As a developer, I want **visual regression tests** (Playwright screenshots) for React and Ink components.
43. As a maintainer, I want **recorded replay fixtures** (deterministically mocked adapter calls) for fast tests without burning real tokens.
44. As the community, I want an **official Discord** (or well-curated GitHub Discussions) with per-package channels + #help + #showcase.
45. As a contributor, I want an **expanded CONTRIBUTING.md** with dev setup in 5 minutes, build troubleshooting, how to run tests, PR flow.
46. As a contributor, I want **well-defined issue labels** (`good first issue`, `help wanted`, `area:adapters`, `area:docs`) applied to the 97 existing issues.
47. As a maintainer, I want **GitHub Sponsors / OpenCollective** configured to accept financial support and add credibility.
48. As an evaluating developer, I want to see **multiple maintainers** listed in the README — even 2–3 at the start changes the perception from "side project" to "serious project".
49. As a maintainer, I want **"AgentsKit" trademark registration** started (USPTO or INPI) before visibility grows.
50. As a maintainer, I want a **documented licensing decision** — keep MIT? Dual-license MIT + commercial for Cloud? BSL? — written in `LICENSING.md` before Phase 4 (Business) starts.
51. As a maintainer, I want a **paid external DX audit** (1 senior dev, $400–1000) reviewing narrative and first developer experience — the objectivity the author can't have alone.
52. As a maintainer, I want a **coordinated launch (HN + Twitter + ProductHunt + Reddit)** planned as a single event when Phase 0 ends — you only get one shot, everything must be ready.

---

## Implementation Decisions

### Closed decisions

- **Fumadocs** will replace Docusaurus in `apps/docs`. Next.js 15 + MDX. Custom theme aligned with the visual identity.
- **Official domain: agentskit.io** — configure DNS pointing to Vercel/Cloudflare Pages, with planned subdomains: `agentskit.io` (landing), `docs.agentskit.io` (Fumadocs), `play.agentskit.io` (future playground).
- **Landing separate from docs** — standalone Next.js in `apps/landing` or hosted at the domain root; docs on subdomain `docs.agentskit.io`.
- **Keep pnpm + Turborepo monorepo** — no structural reorganization in this phase.

### Modules to create/modify

- **`apps/docs`** — full migration to Fumadocs preserving content structure; i18n reviewed.
- **`apps/landing`** (new) — Next.js for marketing, SEO, conversion.
- **`.github/`** — issue templates, PR template, RFC template, CODEOWNERS, extra workflows (size-limit, coverage gate, e2e).
- **`rfcs/`** (new) — folder of versioned RFCs.
- **`docs/architecture/`** — numbered ADRs (`0001-adapter-contract.md`, `0002-tool-contract.md`, etc.).
- **`ARCHITECTURE.md`, `MANIFESTO.md`, `ORIGIN.md`, `LICENSING.md`** (new, at root).
- **`packages/*/CONVENTIONS.md`** (new) — one per package with specific contribution rules.
- **`packages/*/README.md`** — rewritten with dedicated pitch + stability tier + link to the docs.
- **Root README.md** — rewritten with a strong narrative, honest comparisons, link to agentskit.io.

### Deep modules — candidates for isolated tests

- **ContractValidator** (born here) — validates at runtime that an adapter/tool/skill implements the current contract. Interface: `validate(impl, contract) → Report`.
- **BundleBudgetCheck** — wrapper over `size-limit` with per-package config. Interface: `check(package) → Pass|Fail`.
- **AdapterContractSuite** — test suite that runs the same battery against any adapter. Interface: `run(adapter, opts) → Report`.

### Contracts / APIs

- **ADRs will be the canonical format** for core contracts. A contract change = new ADR + major bump of the affected package.
- **Stability tier** declared in `package.json` via a custom field `"stability": "stable" | "beta" | "experimental"`.
- **RFC process**: PR in `rfcs/` with a template, open discussion, approval from 2+ maintainers before becoming an implementation issue.

### Suggested prioritization (within 4–6 weeks)

- **Weeks 1–2**: Track 1 (contracts/governance) + start Track 2 (manifesto, origin, root README)
- **Weeks 2–4**: Track 3 (Fumadocs migration, Concepts, Recipes) parallel to Track 2 (visual identity, landing)
- **Weeks 4–5**: Track 4 (quality, Discord, CODEOWNERS, analytics) + migration guides
- **Week 6**: External DX audit + adjustments + coordinated-launch rehearsal

### Breaking changes

- Phase 0 **cannot introduce breaking changes** in published packages. It's hardening, not refactoring.
- Rewritten READMEs, migrated docs, tightened CI — all orthogonal to the runtime.

---

## Testing Decisions

### What makes a good test here

- **Reusable contract tests** per category (adapter, tool, skill) — one battery any future implementation runs automatically.
- **E2E of the examples is the most important test** — if `example-react` works with chat streaming + tool call + memory, the library works.
- **Avoid LLM-string snapshots** — use structural matchers or semantic tolerance when needed.

### Modules with tests

- **ContractValidator, BundleBudgetCheck, AdapterContractSuite** — deep modules created in this phase.
- **Playwright E2E** in `apps/example-react`, `apps/example-ink`, `apps/example-runtime`, `apps/example-multi-agent`.
- **Visual regression** on critical components of `@agentskit/react` (ChatContainer, Message, InputBar) and `@agentskit/ink`.

### Prior art

- Vitest is already the runner. Keep it.
- `size-limit` or `bundlewatch` has a ready-made GitHub Actions template.
- Playwright monorepo setup: use a shared `playwright.config.ts`.

---

## Out of Scope

- **Implementation of any Master PRD story (#113 and children #114–#210)** — left for Phase 1 onward.
- **AgentsKit Cloud** and any commercial work — Phase 4.
- **New packages** — Phase 0 only hardens the existing 14; no additions (except `apps/landing`).
- **Name rebranding** — "AgentsKit" stays; only gains a strong visual identity.
- **Core rewrite** — core is fine, only needs formalized contracts.
- **Python SDK** — stays out of scope.

---

## Further Notes

### How this PRD becomes issues

Every user story (1–52) becomes 1 GitHub issue with:
- Title: `[Phase 0] Story NN — <summary>`
- Label: `phase-0-foundation` + track label (`track-contracts`, `track-narrative`, `track-docs`, `track-quality`)
- Link back to this PRD.

### Gates for Phase 1 to start

No Master PRD issue should be started until **all of these** are true:

- [ ] ADRs for the 6 core contracts published (Adapter, Tool, Memory, Retriever, Skill, Runtime)
- [ ] Bundle budget and coverage gate active and blocking PRs
- [ ] Root README rewritten + MANIFESTO + ORIGIN published
- [ ] agentskit.io live with a basic landing
- [ ] Fumadocs migration complete with Concepts section and ≥5 Recipes
- [ ] LangChain and Vercel AI migration guides published
- [ ] Playwright E2E running on the 4 examples
- [ ] Discord + CODEOWNERS + issue/PR templates active
- [ ] Licensing decision documented

### Non-negotiable bets of the phase

1. **Formalize contracts** before adding 10 new adapters.
2. **Rewrite the narrative** before launching publicly.
3. **Fumadocs + agentskit.io** before growing traffic.
4. **E2E for examples** before accepting 97 feature PRs.

### Principles (already in CLAUDE.md, reinforced)

- Core <10KB gzip, zero deps.
- Every package plug-and-play.
- Total interop across packages.
- Named exports only, no default exports.
- TypeScript strict, no `any`.
