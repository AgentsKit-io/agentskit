# ADR 0012 — Vendor adapter scope & granularity

- Status: Accepted
- Date: 2026-06-10
- Supersedes: —
- Related issues: —

## Context

AgentsKit integrates third-party vendors at several layers, and the packaging
has grown ad-hoc into **three different granularities** for what is essentially
the same idea — "an adapter that implements a core contract for a specific
provider":

| Layer | Package(s) | Granularity |
|---|---|---|
| LLM providers | `@agentskit/adapters` | **bundled** — all providers in one package |
| Service integrations | `@agentskit/integrations` | **bundled** — 50 services in one package |
| Observability | `@agentskit/observability` + `@agentskit/observability-langfuse` | base + **per-vendor** |
| Eval | `@agentskit/eval` + `@agentskit/eval-braintrust` | base + **per-vendor** |
| Tool-arg validation | `@agentskit/validation` (Ajv) | **standalone** |

Contributors reasonably ask: why is OpenAI bundled inside `adapters` but
Langfuse gets its own package? Why is a 50-service catalog one package but
Braintrust is split out? Without a rule, every new vendor adapter re-litigates
this, and the surface drifts. The Manifesto fixes the **core** (zero-dep,
< 10 KB, contracts only) but is silent on where *non-core* vendor adapters live
and how finely they are split.

## Decision

A vendor adapter's home is decided by **dependency weight + tree-shakeability**,
not by layer or by habit.

**1. Bundle when connectors are dependency-light.** If a provider can be
implemented with only `fetch` + Node built-ins (no heavy runtime SDK), it lives
**inside the layer's bundled package** as a tree-shakeable named export.
Importing one provider must not pull the others.
- Applies to: `@agentskit/adapters` (LLM providers are `fetch`/SSE), and
  `@agentskit/integrations` (HTTP service connectors via the shared `httpJson`).

**2. Split per-vendor when the adapter needs a heavy or non-tree-shakeable
runtime dependency** — typically a vendor SDK. It becomes its own package named
`@agentskit/<layer>-<vendor>` that depends on the abstract base + the SDK.
- Applies to: `@agentskit/observability-langfuse` (langfuse SDK),
  `@agentskit/eval-braintrust` (braintrust SDK), and `@agentskit/validation`
  (Ajv — same rule, the "vendor" is a library rather than a SaaS).

**3. First-party criterion.** An adapter ships in this monorepo only if all hold:
  (a) it implements an existing core contract (Adapter, Tool, Integration,
      Observer, Scorer, ArgsValidator, …);
  (b) it is broadly useful **or** serves as the reference implementation of the
      contract;
  (c) the maintainers commit to its upkeep against the vendor's API/SDK churn.
Adapters that fail (b)/(c) — niche or unmaintained vendors — belong in a
separate community/third-party package and are documented as such, not shipped
first-party.

**4. Naming.** Per-vendor splits use `@agentskit/<layer>-<vendor>`
(`observability-langfuse`, `eval-braintrust`). Bundled providers are named
exports within the layer package.

## Rationale

- **Protects the Manifesto's lightweight guarantee** at every layer, not just
  core: a heavy vendor SDK never becomes a transitive dependency of consumers
  who don't use that vendor.
- **One predictable rule** replaces three accidental ones. "Does it need an SDK?"
  is objective and answerable at PR time.
- It explains the current packages *post-hoc* without rework: integrations and
  LLM adapters are `fetch`-based → bundled; Langfuse/Braintrust/Ajv are
  SDK-backed → split. Nothing has to move.
- Keeps the solo-maintainer surface honest: criterion (3) prevents the monorepo
  from accreting niche vendor adapters that quietly rot.

## Consequences

- `@agentskit/observability-langfuse`, `@agentskit/eval-braintrust`, and
  `@agentskit/validation` are **justified by rule** (heavy SDK → per-vendor),
  not by accident.
- New service integrations stay inside `@agentskit/integrations` as long as they
  are `fetch`-based; the moment one genuinely needs a heavy SDK (e.g. an AWS
  client requiring SigV4 signing), it is split into `@agentskit/integrations-<vendor>`
  or kept as an SDK-injected tool — consistent with leaving AWS S3/SES/SNS/SQS
  out of the catalog.
- New observability/eval vendors each get their own `@agentskit/<layer>-<vendor>`
  package.
- A "first-party vs community" line now exists; niche vendor PRs can be
  redirected to community packages with a documented reason.

## Alternatives considered

- **All vendors bundled per layer.** Rejected: forces heavy SDKs (langfuse,
  braintrust, ajv, aws-sdk) onto every consumer of the layer, breaking the
  lightweight guarantee and tree-shaking (SDKs are side-effectful / not
  reliably shakeable).
- **All vendors split per-vendor (incl. LLM providers & integrations).**
  Rejected: explodes the package count for `fetch`-based connectors that cost
  nothing to bundle, and worsens the install/discovery experience for the common
  case.
- **No rule (status quo).** Rejected: this ADR exists precisely because the
  ad-hoc state invites re-litigation and drift.

## Open questions

- Should the bundled `@agentskit/adapters` eventually expose provider subpath
  exports (`@agentskit/adapters/openai`) for stricter tree-shaking? Out of scope
  here; revisit if bundle size regresses.
- Threshold for "heavy": today the test is "requires a runtime SDK dependency."
  If a future provider needs only a *tiny* dep, prefer an `optionalDependencies`
  entry inside the bundled package over a new package.

## References

- Manifesto, Vital Rule 1 (core lightweight, zero-dep) and Rule 2 (plug-and-play,
  independently installable) — `CLAUDE.md`.
- ADR 0001 (Adapter contract), ADR 0002 (Tool contract), ADR 0009 (Composition
  & dependency rules).
- `@agentskit/integrations` catalog (ADR-less; this ADR retroactively frames its
  bundling choice).
