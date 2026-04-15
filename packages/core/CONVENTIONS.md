# Conventions — `@agentskit/core`

The sacred package. Every rule here is stricter than the rest of the monorepo.

## Non-negotiables

- **Zero runtime dependencies.** `dependencies` in `package.json` is empty and stays empty. Never add one, not even "small".
- **Under 10KB gzipped.** CI (`size-limit`) enforces. If you're pushing the limit, the change is too big.
- **Contracts first.** Public types and interfaces for every contract live here — Adapter, Tool, Memory, Retriever, Skill, Runtime. Implementations live in other packages.
- **Named exports only.** No default exports, anywhere, ever.
- **No `any`.** Use `unknown` and narrow with type guards.

## What belongs here

- **Types and interfaces** for the six core contracts (ADRs 0001–0006)
- **Shared primitives** reused by multiple packages: `createEventEmitter`, `safeParseArgs`, `consumeStream`, message-building helpers
- **The chat controller** (`controller.ts`) — headless state machine for a chat session
- **The agent loop core** (`agent-loop.ts`) — the substrate the runtime builds on

## What does NOT belong here

- Any provider SDK or API client → `@agentskit/adapters`
- Any React hook or component → `@agentskit/react`
- Any Ink component → `@agentskit/ink`
- Any file I/O → `@agentskit/memory` or a package that's not zero-dep
- Any `node:*` import that's not available on every runtime we target (edge, Deno, browser)

## Adding a new primitive

1. Is the thing a **contract type**? Put it in `src/types/*.ts` and re-export from `src/types/index.ts`. Write an ADR if it's cross-package.
2. Is it a **reusable helper** used by 2+ packages? Put it in `src/primitives.ts` or a dedicated file, export from `src/index.ts`.
3. Write unit tests that exercise only the public export. Do **not** reach into internals.

Every addition raises the bundle size. Run `pnpm size` in the repo root and verify the core budget still holds.

## Testing

- Pure unit tests with `vitest`. Environment is `node`.
- Avoid mocks — test real functions with real inputs.
- Mocked adapters for stream-related tests are acceptable since the Adapter contract is the seam.

## Files you can edit without an ADR

- Bug fixes that don't change exported types
- New internal helpers (not exported)
- JSDoc improvements
- Test additions

## Files that require an ADR first

- Any `src/types/*.ts` change that alters an exported type
- Any new exported function or class
- Anything that touches the bundle size beyond ~500 bytes gzipped

## Review checklist for this package

- [ ] No new runtime dependency (check `package.json`)
- [ ] Bundle size under 10KB gzipped (`pnpm size`)
- [ ] Coverage threshold holds (75% lines)
- [ ] No `any` introduced
- [ ] Named exports only
- [ ] ADR linked if a contract changed
