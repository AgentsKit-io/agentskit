---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0012-vendor-adapter-scope.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor

> [!tldr] Em linguagem comum
> Vendor adapter scope & granularity.

← [[00 Decisões - agentskit]]

## Status e datas

- Status: Accepted; - Date: 2026-06-10.

## Decisão em linguagem comum

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

## Contexto

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

## Consequências

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

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0012-vendor-adapter-scope.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- Supersedes: —

## Fonte

`docs/architecture/adrs/0012-vendor-adapter-scope.md:1`
