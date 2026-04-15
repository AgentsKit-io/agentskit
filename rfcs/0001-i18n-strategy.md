# RFC 0001 — Documentation i18n strategy

- **Status**: Proposed
- **Date**: 2026-04-15
- **Author**: @EmersonBraun
- **Related issues**: #239
- **Related PRs**: #277 (Fumadocs migration)

## Summary

Decide what happens to the three existing non-English locales (`pt-BR`, `es`, `zh-Hans`) on `apps/docs` now that the docs site is moving from Docusaurus to Fumadocs — and what's expected going forward.

The recommendation: **freeze all translations at migration time**, ship the EN-only Fumadocs site first, and revisit localization as a separate initiative once the EN source stabilizes.

## Motivation

Docusaurus shipped mature first-party i18n with `apps/docs/i18n/{es,pt-BR,zh-Hans}` already populated. Fumadocs leaves i18n to the consumer — there is no single blessed plugin. We need an explicit decision about:

1. What happens to the existing translated content during the Fumadocs migration
2. Whether we invest in multi-language coverage now, later, or not at all
3. Who owns translations if we do

Shipping Fumadocs without a decision means translations silently break when `docs.agentskit.io` goes live. Making the decision in a hurry at launch is worse than deliberating now.

## Current state

`apps/docs/i18n/` (Docusaurus):

- 144 files across three locales
- Bulk of the content is **theme strings and auto-generated `code.json`** (~22 KB), not real translated prose
- A smaller set of manually translated pages exists, authored during earlier content sprints
- No contributor process: translations were one-off pushes, not continuously maintained
- No drift detection: an EN page edited after translation has no signal that the translations are stale

Fumadocs (`apps/docs-next`) currently ships EN only.

## Options considered

### A. Freeze translations at migration time (recommended)

- During Fumadocs migration: move `apps/docs/i18n/*` into a `apps/docs-next/content/docs-archive/{locale}/` tree, **not wired into the sidebar**, behind a soft redirect ("This locale is paused — see the English version")
- Fumadocs EN is the canonical source
- Revisit multilingual coverage in a **separate RFC** once the EN surface is stable for at least 3 months
- If/when we resume, pick an execution path (B or C below)

**Pros:**
- Zero drift risk going forward
- Clear communication to existing readers (we don't silently delete their locale)
- Doesn't lock us into a delivery mechanism prematurely
- Aligns with Manifesto principle 6 (docs are product) — half-maintained translations are anti-product

**Cons:**
- Readers on the three locales lose their landing experience in the short term
- Feels like a step backward even though it's the honest move

### B. Continuous machine translation (LLM-assisted)

- Use a translation model (e.g., Claude Sonnet or GPT-4o) on every merge to produce candidate translations for the three locales
- Human-review queue for technical terminology
- Either a Vercel deploy hook or a GitHub Action runs the pipeline

**Pros:**
- Keeps translations warm automatically
- Dogfoods AgentsKit (the translation itself could be an AgentsKit skill)
- Low ongoing human cost

**Cons:**
- Technical docs quality is highly sensitive to tone and terminology — machine translation of an ADR or an invariant is frequently wrong in subtle ways
- Establishing a human-review queue recreates the original problem (contributors we don't have)
- Adds build-time + cost on every merge, without a clear user-count justifying it yet

### C. Crowdin or equivalent managed pipeline

- Send EN source to a Crowdin-like platform
- Community contributors translate through the platform UI
- Pull translated files back as a separate `content/docs-{locale}/` tree

**Pros:**
- Industry-standard
- Clear contributor experience for native speakers
- Professional translators can work in the same pipeline if we ever fund it

**Cons:**
- Another external dependency (contradicts Manifesto principle 4 — zero lock-in, applied to tooling)
- Crowdin's free tier for OSS is generous but has caps
- Still depends on people showing up to translate — not solved by the tool

### D. Do nothing / delete the translations

- Remove `apps/docs/i18n` wholesale, no archive, no redirect
- Fumadocs site is EN-only forever

**Pros:**
- Simplest
- Matches what we'll actually maintain

**Cons:**
- Discards work that was done in good faith
- Existing readers on `pt-BR` / `es` / `zh-Hans` just see 404s
- Burns goodwill at launch time for no technical gain

## Decision

**Adopt option A: freeze and archive.**

Reasoning (in order of weight):

1. **Zero drift is the only honest place to be right now.** We have no translation contributors, no QA process, no commitment from maintainers to keep non-EN pages current. Any option that ships translations implies a commitment we haven't made.
2. **Archive (not delete) preserves the work.** When we eventually re-engage, the existing Spanish / Portuguese / Chinese prose is a starting point, not a clean slate.
3. **EN stability is prerequisite.** Concepts, Recipes, Migrating, and the ADRs are still shifting weekly in Phase 0. Translating moving targets is wasted motion.
4. **Deferring the execution path is low-cost.** Once EN is stable and we see which locales actually have traffic (PostHog — see #243), we can pick B or C with data.

### Implementation plan (fits under #239)

When `apps/docs-next` is promoted to `docs.agentskit.io`:

1. **Archive current translations** under `apps/docs/archive-i18n/{locale}/`. Add a `README.md` explaining the freeze and pointing to this RFC.
2. **Add locale-aware redirects** at the subdomain level (Vercel/Cloudflare Pages):
   - `docs.agentskit.io/pt-BR/*` → `docs.agentskit.io/*` with a one-time banner "This locale is paused. English is the canonical source."
   - Same for `/es/*` and `/zh-Hans/*`
3. **Document the decision** in `apps/docs-next/content/docs/contributing/translations.mdx` (create) with the "this is paused, how to raise it" path.
4. **Add a traffic-check metric** in the PostHog dashboard for the three archived locale paths — if any of them sustains non-trivial hits for 3 months, it informs the next decision.
5. **Retire `apps/docs/i18n/*` from the Docusaurus build** (the legacy site stays EN-only during transition).

### When we revisit (criteria, not dates)

Open a new RFC (0002-localization-restart or similar) when **any** of these become true:

- An external contributor offers sustained translation coverage (>50% of EN surface maintained for >1 month)
- A corporate sponsor funds professional translation
- Traffic data shows a locale with ≥10% of EN traffic in the equivalent path
- An AgentsKit-hosted translation agent (dogfooding a skill) reaches acceptable quality — "acceptable" to be defined in that future RFC

Not on the list: calendar time, community pressure without contributor commitment, competitive parity.

## Consequences

### Positive

- Fumadocs migration ships without an uncommitted translation dependency
- Readers get a clear "this is paused" message instead of stale/broken content
- EN source is free to keep moving fast in Phase 0
- Decision is data-informed next time (PostHog signals)
- Existing translated prose is preserved, not discarded

### Negative

- Three locales lose their landing UX at launch
- "Global-ready" marketing claim has to wait — which is fine because it wasn't true yet anyway
- Some goodwill cost to contributors whose past translations aren't actively served (mitigated by the archive)

### Neutral

- Legacy Docusaurus site stays available during the transition (EN only) via `pnpm docs:legacy`
- Option B (LLM-assisted) and option C (Crowdin) remain open; we haven't ruled them out, only deferred

## Alternatives considered

See Options section above — B, C, D.

## Open questions

- **Archive location**: `apps/docs/archive-i18n/` vs a separate `agentskit-i18n-archive` repo. Current proposal keeps them in-repo for discoverability; move out if it bloats the main repo meaningfully.
- **Redirect UX**: one-time banner vs persistent notice. Current proposal: one-time, dismissible, then silent.
- **Future translation workflow ownership**: volunteer (unpaid), community-funded, or paid. Decide when we reopen the question.
- **Translated landing page**: separate question from translated docs. A marketing landing in N languages is cheaper and higher-leverage than full docs — may ship independently.

## References

- Phase 0 PRD #211 (story #239 i18n strategy decision)
- Fumadocs migration: PR #277 + ADR 0007
- Analytics infrastructure: PR #277 (#243) — needed for the traffic-check criterion
- Manifesto principles 4 (zero lock-in), 6 (docs are product), 10 (open by default)
