# Phase 1 — Review Report

> Generated 2026-04-15. Run before officially closing Phase 1.

## 1. Audit — build + test + lint + size

| Check | Status | Detail |
|---|---|---|
| `pnpm install` | ✅ | Clean |
| `pnpm build` (packages) | ✅ | All 14 packages built |
| `pnpm test` | ✅ | 22 / 22 tasks passing after cherry-picking the ink test fix that was lost in an earlier merge (included in `fix/ink-test-suite`) |
| `pnpm lint` | ✅ | 28 / 28 tasks passing (tsc --noEmit across packages) |
| `pnpm exec size-limit` | ✅ | Every package under budget |
| `@agentskit/docs` (legacy Docusaurus) | ❌ | Broken on Node 25 — known, will be retired by the Fumadocs migration |

### Blocker found during audit

**Ink test regression**. Commit `e8416bf` (from PR #265 timeline) that rewrote ink tests to work around ink@7 / ink-testing-library@4 incompat never made it to `main`. Fixed in this review via cherry-pick to `fix/ink-test-suite`. **This branch should merge before closing Phase 1.**

---

## 2. Tour — new code shipped

| Module | Lines | What it does |
|---|---|---|
| `packages/cli/src/init.ts` | 539 | 4 templates (react, ink, runtime, multi-agent) with full wiring |
| `packages/cli/src/init-interactive.ts` | 151 | @inquirer prompts + summary + confirm |
| `packages/cli/src/doctor.ts` | 295 | Node / pm / packages / config / env keys / reachability |
| `packages/cli/src/dev.ts` | 180 | chokidar watch + tsx spawn + keyboard shortcuts |
| `packages/cli/src/tunnel.ts` | 115 | localtunnel wrapper |
| `packages/adapters/src/utils.ts` | +232 | `fetchWithRetry`, `simulateStream`, `chunkText` |
| `packages/adapters/src/mock.ts` | 198 | `mockAdapter`, `recordingAdapter`, `replayAdapter`, `inMemorySink` |
| `packages/observability/src/cost-guard.ts` | 191 | Pricing table + observer + abort |
| `packages/core/src/types/adapter.ts` | +32 | `AdapterCapabilities` interface |
| `packages/core/src/types/chat.ts` | +20 | `EditOptions` + `edit` / `regenerate` in ChatController |
| `packages/core/src/controller.ts` | +70 | `edit` + `regenerate` implementations |

---

## 3. Smoke test — end-to-end

```bash
node packages/cli/dist/bin.js init --dir /tmp/smoke-runtime --template runtime --provider demo -y
# → Created runtime starter
```

Generated files match expectations: `package.json`, `tsconfig.json`, `src/index.ts`, `.env.example`, `.gitignore`, `README.md`. `package.json` declares only the packages actually used (no `@agentskit/adapters` when provider is `demo`).

```bash
node packages/cli/dist/bin.js doctor --no-network
# → 2 pass · 1 warn · 3 fail · 2 skip
```

Doctor correctly warns about Node 25 + flags missing API keys (no crash, proper exit code).

---

## 4. Metrics

### Test counts (14 packages)

| Package | Tests |
|---|---|
| @agentskit/adapters | 90 |
| @agentskit/core | 79 |
| @agentskit/cli | 58 |
| @agentskit/skills | 44 |
| @agentskit/react | 41 |
| @agentskit/observability | 40 |
| @agentskit/runtime | 39 |
| @agentskit/tools | 28 |
| @agentskit/memory | 26 |
| @agentskit/ink | 23 |
| @agentskit/rag | 22 |
| @agentskit/templates | 21 |
| @agentskit/sandbox | 14 |
| @agentskit/eval | 13 |
| **Total** | **538** |

### Bundle sizes (gzipped, against budget)

| Package | Size | Limit | Headroom |
|---|---|---|---|
| `@agentskit/core` (ESM) | 5.17 KB | 10 KB | 48% |
| `@agentskit/core` (CJS) | 5.26 KB | 10 KB | 47% |
| `@agentskit/adapters` | 6.3 KB | 20 KB | 69% |
| `@agentskit/react` | 2.59 KB | 15 KB | 83% |
| `@agentskit/runtime` | 2.34 KB | 15 KB | 84% |
| `@agentskit/memory` | 2.84 KB | 15 KB | 81% |
| `@agentskit/rag` | 852 B | 10 KB | 92% |
| `@agentskit/tools` | 2.27 KB | 15 KB | 85% |
| `@agentskit/skills` | 5.19 KB | 10 KB | 48% |
| `@agentskit/observability` | 3.83 KB | 10 KB | 62% |
| `@agentskit/eval` | 556 B | 10 KB | 95% |
| `@agentskit/sandbox` | 1.53 KB | 10 KB | 85% |
| `@agentskit/ink` | 1.34 KB | 15 KB | 91% |
| `@agentskit/cli` | 210 B | 20 KB | 99% |
| `@agentskit/templates` | 2.89 KB | 15 KB | 81% |

**Manifesto principle 1 holds**: core is 5.17 KB gzipped, 48% under budget despite Phase 1 adding capabilities + retry + simulate-stream + edit/regenerate to its surface.

---

## 5. Docs coverage — Phase 1 features

| Feature | Doc hits | Status |
|---|---|---|
| `agentskit init` | 5 pages | ✅ Recipe + README |
| `agentskit doctor` | 1 page | ⚠️ Changelog only |
| `agentskit dev` | 1 page | ⚠️ Changelog only |
| `agentskit tunnel` | 1 page | ⚠️ Changelog only |
| retry (adapters) | 7 pages | ✅ Covered |
| `mockAdapter` | 1 page | ⚠️ Recipe reference only |
| capabilities | 2 pages | ✅ |
| `simulateStream` | 0 pages | ❌ Undocumented |
| `costGuard` | 0 pages | ❌ Undocumented (recipe mentions manual version) |
| `edit(` | 0 pages | ❌ Undocumented |
| `regenerate(` | 0 pages | ❌ Undocumented |

**Action required before closing Phase 1**: create a single "Phase 1 features" doc page (or per-feature recipes) for the 4 items at 0 hits: `simulateStream`, `costGuard`, `edit`, `regenerate`.

### Changeset coverage

10 pending changesets, all paired with Phase 1 PRs:

```
adapter-capabilities.md   adapter-retry.md         chat-edit-regenerate.md
core-browser-compat.md    cost-guard.md            dev-command.md
doctor-command.md         dry-run-mode.md          init-interactive.md
tunnel-command.md
```

---

## 6. Release dry-run

`pnpm changeset status` summarizes what the next release will ship:

| Package | Bump | Reason |
|---|---|---|
| `@agentskit/core` | **major** | `createFileMemory` + `loadConfig` removed (browser-compat) — ADR 0001 still valid, APIs changed |
| `@agentskit/adapters` | minor | retry + capabilities + mock/recording/replay + simulateStream |
| `@agentskit/cli` | minor | init (interactive) + doctor + dev + tunnel + loadConfig moved in |
| `@agentskit/react` | minor | `edit` + `regenerate` on useChat; `createFileMemory` re-export dropped |
| `@agentskit/ink` | minor | same as react |
| `@agentskit/memory` | minor | `fileChatMemory` added |
| `@agentskit/observability` | minor | `costGuard` + `priceFor` + `DEFAULT_PRICES` |
| `@agentskit/eval` | patch | no surface changes |
| `@agentskit/rag` | patch | no surface changes |
| `@agentskit/runtime` | patch | no surface changes |
| `@agentskit/sandbox` | patch | no surface changes |
| `@agentskit/skills` | patch | no surface changes |
| `@agentskit/templates` | patch | no surface changes |
| `@agentskit/tools` | patch | no surface changes |

**Release path**: `pnpm changeset version` → review generated version bumps & CHANGELOGs → commit → `pnpm changeset publish`.

---

## Gates before officially closing Phase 1

- [ ] Merge `fix/ink-test-suite` (cherry-pick of the ink@7 test fix that was lost)
- [ ] Add doc pages for `simulateStream`, `costGuard`, `edit`, `regenerate`
- [ ] Consider whether the `@agentskit/core` major bump is the moment to publish v1.0 on core, or defer
- [ ] Run `pnpm changeset version` locally and review the generated CHANGELOGs before `changeset publish`
- [ ] Announce the release publicly (HN / Twitter / Discord) — per the pre-launch plan in `docs/MASTER-EXECUTION-PLAN.md`
