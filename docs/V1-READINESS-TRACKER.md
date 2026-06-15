# v1.0.0 ecosystem readiness tracker

> Living doc. Tracks the criteria in [`STABILITY.md`](./STABILITY.md) → "Until v1.0.0"
> plus cross-framework parity. Update the status columns as work lands; the audit
> + plan that seeded this lives in [`studies/v1-readiness-audit.md`](./studies/v1-readiness-audit.md).
> Last updated: 2026-06-15.

## Project-level v1.0.0 criteria

| # | Criterion (from STABILITY.md) | Status | Evidence / gap |
|---|---|---|---|
| 1 | All six core contracts have ≥1 **external consumer** outside this repo | ⬜ not tracked | No external-consumer registry yet. Add links here as real consumers adopt Adapter / Tool / Memory / Retriever / Skill / Runtime contracts. |
| 2 | CI gates (bundle size, coverage) held **two full sprints** without regression | 🟡 in progress | Gates exist + green (17 structural + size-limit + coverage). Need a sprint-over-sprint record — start counting from the first green sprint after this audit. |
| 3 | Public **semver commitment** documented + honored | 🟢 documented | Ecosystem-wide statement at [`SEMVER-COMMITMENT.md`](./SEMVER-COMMITMENT.md); honored structurally by CI gates (tier/badge parity, coverage floors, promotion-RFC, bundle budget). "Honored" stays ongoing across releases. |

Legend: 🟢 done · 🟡 in progress · ⬜ not started.

## Stability tiers (gate-enforced)

`check-stability-tier`, `check-readme-badge`, `check-coverage-floor`, and
`check-promotion-rfc` keep `package.json`, the `STABILITY.md` map, README badges,
coverage bars, and promotion RFCs in lockstep. See [`STABILITY.md`](./STABILITY.md)
for the authoritative tier map.

- **stable (1):** core
- **beta (21):** adapters, cli, ink, memory, rag, react, runtime, skills, templates,
  tools, eval, eval-braintrust, observability, observability-langfuse, validation,
  sandbox, **vue**, **svelte**, **solid**, **react-native**, **angular**
- **alpha (2):** integrations, mcp

## Cross-framework binding parity

The ecosystem promise is "same `ChatReturn` contract, every host." `useChat` /
store / service already returns the identical contract everywhere. The remaining
work is the **headless component suite** (8 components mirroring `@agentskit/react`).

| Binding | useChat/contract | Headless components | Tier | Notes |
|---|---|---|---|---|
| react | ✅ | ✅ 8/8 | stable→beta* | Canonical reference |
| ink | ✅ | ✅ (terminal set) | beta | ANSI/keyboard variant |
| **vue** | ✅ | ✅ 8/8 | **beta** | First binding at parity (runtime `h()`) |
| **svelte** | ✅ (`createChatStore`) | ✅ 8/8 | **beta** | Svelte 5 `.svelte` + `esbuild-svelte` build + `svelteTesting` — reference for compiler-based bindings |
| **solid** | ✅ | ✅ 8/8 | **beta** | Solid JSX + `vite-plugin-solid`/`esbuild-plugin-solid`; `data-ak-*` |
| **react-native** | ✅ | ✅ 8/8 | **beta** | RN primitives, `testID`-keyed headless; vitest RN mock |
| **angular** | ✅ (`AgentskitChat`) | ✅ 8/8 | **beta** | Standalone components, JIT inline templates, TestBed; AOT/`ng-packagr` build tracked |

\* react is `beta` per the honest-tier reconciliation; promote to stable via a
promotion RFC when its `ChatReturn` surface is frozen.

**All 6 bindings now at beta parity** (react, ink, vue, svelte, solid, react-native, angular).
Remaining ecosystem work:
- **angular AOT/`ng-packagr`** — *decided 2026-06-15: keep JIT + documented caveat for beta*
  (AOT would break the "tsup, dual CJS/ESM" convention; APF is ESM-only). Revisit AOT as a
  deliberate, ADR-backed decision before angular → stable, per RFC 0004.
- **beta→stable promotions** — surface frozen in RFC 0004 (Proposed); each binding promotes
  once it completes ≥ 1 minor at beta without breaking (soak gate; started 2026-06-15).
- **v1.0.0 criteria #1 (external consumers) + #2 (2-sprint gate hold)** — require real adoption
  and elapsed time; cannot be manufactured. Criterion #3 (semver commitment) is documented.
