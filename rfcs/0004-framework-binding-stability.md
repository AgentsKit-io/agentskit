# RFC 0004 — Framework binding stability (beta → stable)

- **Status**: Proposed
- **Date**: 2026-06-15
- **Author**: @EmersonBraun
- **Related**: [`docs/STABILITY.md`](../docs/STABILITY.md), [`docs/V1-READINESS-TRACKER.md`](../docs/V1-READINESS-TRACKER.md), ADRs 0001/0006 (Adapter/Runtime), `@agentskit/core` `ChatReturn` contract

## Summary

The framework bindings — `@agentskit/react`, `ink`, `vue`, `svelte`, `solid`,
`react-native`, `angular` — now all sit at **beta** with full headless component
parity. This RFC proposes the **public API surface each binding commits to** when
it graduates to `stable`, so the promotion (when the beta-soak gate is met) is a
documented, non-breaking step rather than an ad-hoc bump.

> **This RFC does not promote anything yet.** Per `docs/STABILITY.md`, beta → stable
> requires an RFC (this) **and** at least one minor release where the package operated
> at beta without breaking changes. The bindings reached beta on 2026-06-15, so the
> soak gate is **not yet met**. This RFC is the surface-freeze half; acceptance + the
> soak unlock the actual promotion.

## Committed surface (per binding, at stable)

All bindings expose the same two-layer contract:

### 1. State contract — identical across every binding
The binding's primitive (`useChat` hook / `createChatStore` / `AgentskitChat` service)
returns the `@agentskit/core` **`ChatReturn`**: `messages`, `status`, `input`, `error`,
`usage` + actions `send(text)`, `setInput(v)`, `stop`, `retry`, `clear`, `approve`,
`deny`, `edit`, `regenerate`. This is core's frozen contract — bindings re-expose it
verbatim through their framework's reactivity. Committing to it is committing to core.

### 2. Headless component set — 8 components, identical contract
`ChatContainer`, `Message`, `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`,
`ThinkingIndicator`, `ToolConfirmation`. Each renders **`data-ak-*` attributes only**
(web) or **`testID`/`ak-*`** hooks (react-native) — no styling, no colors. Prop names
and `data-ak-*` keys are the committed surface and must not change in a minor at stable.

## Per-binding caveats to resolve before each promotion

- **react** — canonical; `TopologyGraphView` is an extra beyond the core 8 (decide whether it's in the committed surface).
- **ink** — terminal variant; the ANSI theme system (`InkThemeProvider`/`useInkTheme`) is part of its surface.
- **vue / solid** — runtime-rendered; surface is stable.
- **svelte** — `.svelte` + `esbuild-svelte` build; ship-as-source vs bundled is a build decision, not a surface one.
- **react-native** — `testID`-keyed headless (not `data-ak-*`); confirm the `ak-*` testID names are the committed hooks.
- **angular** — **partial-Ivy AOT/`ng-packagr` (APF) is the published path** (FESM2022 + `.d.ts`). The package is **ESM-only by APF design** — that is the deliberate convention exception vs the repo's default "tsup, dual CJS/ESM" for non-Angular packages. Stable promotion still needs the beta soak + this RFC's acceptance, not another packaging rewrite.

## Promotion checklist (per binding, when soak is met)

1. ≥ 1 minor release at beta with no breaking changes to the surface above.
2. `package.json` `agentskit.stability` → `stable`; README badge → `stable`; `STABILITY.md` row → `stable`.
3. `check-promotion-rfc` is satisfied (this RFC names the binding).
4. Coverage at the stable floor (≥ 90).
5. A changeset documenting the commitment.

## Status / next steps

Proposed. Discuss remaining per-binding caveats (esp. react `TopologyGraphView`).
Angular AOT/APF packaging is landed; the soak clock still starts only after a
published release — this RFC alone does not promote any binding to stable.
No package flips to stable under this RFC until its soak gate is met and a follow-up
changeset lands.
