# AGENTS.md

Universal guidance for AI coding agents (Claude Code, Cursor, Copilot, Kiro, Windsurf, Aider, Codex, etc.) working inside this repository.

> If you are an AI agent: read this file top-to-bottom before making changes. All tool-specific config files in this repo point here.

## What AgentsKit is

AgentsKit is the most complete agent toolkit for the JavaScript ecosystem — 14 plug-and-play packages built on one 5 KB core. It covers chat UIs, autonomous runtimes, tools, skills, memory, RAG, observability, sandboxing, and evaluation.

**Status:** `@agentskit/core` is at v1.0.0 (API frozen at the minor level). All other packages are on 0.x tracks and graduate individually per [`docs/STABILITY.md`](./docs/STABILITY.md).

## Non-negotiable rules

1. **`@agentskit/core` stays tiny.** Zero runtime dependencies. Under 10 KB gzipped. Contains only types, events, contracts, and minimal base logic. Any change that adds a dependency or breaks the size budget is rejected by CI — do not try to bypass.
2. **Every package is plug-and-play.** Simple imports, minimal config, clear contracts, independently installable.
3. **Interop is mandatory.** Any combination of packages must compose.
4. **Contracts are pinned to ADRs.** The six core contracts (Adapter, Tool, Memory, Retriever, Skill, Runtime) live in [`docs/architecture/adrs/`](./docs/architecture/adrs/). Changing a contract requires a new ADR + coordinated major bump of affected packages.
5. **v1 stability promise.** Breaking changes to core require a major bump and a deprecation cycle of ≥ 1 minor release.
6. **Private consumers are black-box evidence only.** Public issues, ADRs, RFCs, docs, tests, fixtures, and source must not expose private repository identifiers, implementation details, product flows, policies, data, topology, or business logic. Convert confidential observations into independently specified public requirements and synthetic fixtures. Follow [`docs/PRIVATE-CONSUMER-POLICY.md`](./docs/PRIVATE-CONSUMER-POLICY.md).

## Code conventions

- TypeScript **strict mode**. No `any` — use `unknown` and narrow.
- **Named exports only.** No default exports.
- Components are **headless** — no hardcoded styles. Use `data-ak-*` attributes.
- All packages build with **tsup**, dual CJS/ESM output.
- Tests use **vitest**. E2E uses **Playwright**.
- Versioning via **Changesets** (`pnpm changeset`).
- Comments: default to none. Only add when the *why* is non-obvious.

## Project shape

Monorepo: pnpm 10 + Turborepo + Changesets.

```
packages/
  core            zero deps, v1.0.0 — the substrate
  adapters        OpenAI, Anthropic, Gemini, Ollama, LangChain, Vercel AI, …
  react           useChat + headless components (browser)
  ink             same hooks, terminal (Ink)
  cli             agentskit init/chat/dev/doctor/tunnel
  runtime         ReAct, reflection, multi-agent orchestration
  tools           browser, fs, web search, code exec, email, calendar
  skills          researcher, critic, writer, planner, coder
  memory          in-memory, file, SQLite, Redis, vector
  rag             plug-and-play retrieval
  sandbox         E2B + WebContainer
  observability   LangSmith, OpenTelemetry, costGuard
  eval            agent benchmarking
  templates       production-ready starters
apps/
  docs-next       Fumadocs + Next.js (canonical docs)
  docs            legacy Docusaurus (being retired)
  example-react   live React example
  example-ink     live Ink example
```

Every package has its own `README.md` + `CONVENTIONS.md`. Read the CONVENTIONS file of the package you're editing before making changes.

## doc-bridge routing

Before editing a package, resolve the handoff:

```bash
pnpm docs:bridge:index   # only if docs changed or the index is stale
pnpm exec ak-docs query package <id> --agent
```

The handoff tells you `startHere`, allowed `editRoots`, package checks, and the matching human documentation. CI runs `pnpm docs:bridge:gate`.

## Workflow expectations for agents

- **Plan first for non-trivial changes.** If the task spans multiple packages or touches contracts, produce a plan and get approval before editing.
- **Scope discipline.** A bug fix doesn't need a refactor. A one-shot operation doesn't need a helper. Don't add features the task didn't ask for.
- **Don't touch contracts casually.** Changes in `packages/core/src/` affect every downstream package. If in doubt, don't.
- **Size budgets are enforced.** Before adding to `core`, run `pnpm size` and confirm you're still under budget.
- **Tests are required** for new behavior. Mirror the patterns in the existing test suites.
- **Changesets are required** for user-facing changes. Run `pnpm changeset` and describe the impact honestly.
- **Never skip pre-commit hooks** (`--no-verify`). Fix the underlying issue.
- **Never force-push** to `main` or any shared branch.

## Commands

```bash
pnpm install                           # install all deps
pnpm build                             # build all packages (turbo)
pnpm test                              # run all tests
pnpm lint                              # type-check (tsc --noEmit)
pnpm dev                               # watch mode
pnpm size                              # enforce bundle budgets
pnpm docs                              # Fumadocs dev server
pnpm docs:bridge:doctor                # doc-bridge coverage for agents + humans
pnpm docs:bridge:gate                  # stale index / human-doc bridge gate
pnpm test:e2e                          # Playwright E2E

pnpm --filter @agentskit/core test     # single package
pnpm changeset                         # create a changeset for your change
```

## Where things are documented

- [Manifesto](./MANIFESTO.md) — the ten principles. Re-read if unsure.
- [ORIGIN](./ORIGIN.md) — why this exists.
- [docs/STABILITY.md](./docs/STABILITY.md) — per-package stability tiers.
- [docs/architecture/adrs/](./docs/architecture/adrs/) — pinned contracts.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — human contribution workflow.
- [CLAUDE.md](./CLAUDE.md) — Claude-specific extensions to this file.

## Anti-patterns (do not do these)

- Adding runtime dependencies to `@agentskit/core`.
- Using `any`, adding default exports, or hardcoding styles.
- Making "while I'm here" refactors outside the task scope.
- Leaving dead code, commented-out blocks, or `// TODO: remove later`.
- Writing docstrings that restate what the code already says.
- Bypassing CI gates with skip flags or comment escapes.
- Amending already-pushed commits.
- Generating files into directories the task didn't mention.

If a rule in this file conflicts with a user's explicit instruction in the current conversation, the user wins — but flag the conflict.
