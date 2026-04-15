# AgentsKit `@agentskit/core` — v1.0.0

> Release cut: 2026-04-15.

After Phase 0 (foundation hardening) and Phase 1 (developer experience + runtime features), the core package reaches v1.

## What hits 1.0 today

Only **`@agentskit/core`** graduates to 1.0.0 in this release. Every other `@agentskit/*` package ships its own minor/patch bump to cover Phase 1 work but stays on the 0.x track. Each will graduate to 1.0 individually as their contracts settle — declared per-package in [`docs/STABILITY.md`](./STABILITY.md).

## Why core is ready

- **Six ADR contracts** (Adapter, Tool, Memory, Retriever, Skill, Runtime) have held across 18 Phase 0 PRs + 9 Phase 1 PRs without breakage
- **Bundle size** is 5.17 KB gzipped — 48% headroom against the 10 KB Manifesto budget, enforced in CI
- **Zero runtime dependencies** preserved
- **TypeScript strict**, no `any`, named exports only
- **Tests**: 79 passing on `@agentskit/core`, 538 total across all 14 packages

## Breaking changes vs 0.4.x

| Removed | Moved to | Migration |
|---|---|---|
| `createFileMemory` | `fileChatMemory` in `@agentskit/memory` | `import { fileChatMemory } from '@agentskit/memory'` |
| `loadConfig`, `AgentsKitConfig`, `LoadConfigOptions` | `@agentskit/cli` | `import { loadConfig } from '@agentskit/cli'` |

Rationale: restore browser compatibility — these helpers pulled Node built-ins into core and crashed any browser consumer. Manifesto principle 1 ("core works in any environment") is now honored.

`createInMemoryMemory` and `createLocalStorageMemory` remain in core — both universal.

## Additive surface (also shipped this cycle)

- **`AdapterCapabilities`** hint type — optional; adapters without it stay fully compliant with ADR 0001
- **`EditOptions`** + `ChatController.edit` + `ChatController.regenerate` — extends the chat contract additively

## Versions this release

```
@agentskit/core            1.0.0   🎉
@agentskit/adapters        0.5.0
@agentskit/cli             0.5.0
@agentskit/ink             0.5.0
@agentskit/memory          0.5.0
@agentskit/react           0.5.0
@agentskit/observability   0.3.0
@agentskit/runtime         0.4.3
@agentskit/skills          0.4.3
@agentskit/tools           0.4.3
@agentskit/eval            0.2.3
@agentskit/sandbox         0.2.3
@agentskit/rag             0.1.3
@agentskit/templates       0.1.2
```

## Commitments that come with v1.0.0

Per [`docs/STABILITY.md`](./STABILITY.md), `@agentskit/core` at v1:

- **API frozen at the minor level** — breaking changes require a major bump and a deprecation cycle
- **Contracts pinned to ADRs** — any contract change requires a new ADR + coordinated major bump of affected packages
- **Deprecations live for ≥ 1 minor release** before removal
- **Every user-facing change** ships with a changeset describing the impact

## Publishing

```bash
pnpm changeset publish
```

This release was prepared with `pnpm changeset version` on 2026-04-15. Review the generated `package.json` + `CHANGELOG.md` files under each package, then publish.

## Manifesto check

The ten principles held throughout Phase 0 + 1. A snapshot at release time:

1. ✅ Core <10KB gzipped, zero deps — 5.17 KB, zero deps
2. ✅ Every package plug-and-play — 14 packages, independently installable
3. ✅ Interop radical — any combination composes
4. ✅ Zero lock-in — all contracts open, all storage local first
5. ✅ Agent-first — runtime, skills, delegation are first-class
6. ✅ Docs are product — 74 Fumadocs routes, 7 ADRs, 13 recipes, 3 migration guides
7. ✅ TypeScript rigor — no `any`, named exports only, strict mode
8. ✅ Small, deep, testable modules — 538 tests, coverage gates in CI
9. ✅ Predictable beats clever — one entry point per primitive
10. ✅ Open by default — roadmap, RFCs, ADRs all public

The substrate is stable. Build on it.
