# Conventions — `@agentskit/angular`

Angular 18+ binding for the shared `ChatReturn` contract. Ships an injectable
service (Signals + RxJS) and eight headless standalone components.

Published via **partial-Ivy AOT** / `ng-packagr` (APF FESM2022 + `.d.ts`,
ESM-only). Peers: `@angular/core ^18 || ^19 || ^20 || ^21` and `rxjs ^7`.

## Scope

- **`AgentskitChat`** — `@Injectable({ providedIn: 'root' })` service wrapping
  `createChatController`. Exposes `state: WritableSignal<ChatState | null>`,
  `stream$: Observable<ChatState | null>`, `init(config)`, and the full
  `ChatReturn` action surface (`send`, `stop`, `retry`, `setInput`, `clear`,
  `approve`, `deny(id, reason?)`, `edit`, `regenerate`, `proposeToolCall`,
  `destroy`).
- **Headless standalone components** (inline templates, `data-ak-*` only):
  `ChatContainerComponent`, `MessageComponent`, `InputBarComponent`,
  `MarkdownComponent`, `CodeBlockComponent`, `ToolCallViewComponent`,
  `ThinkingIndicatorComponent`, `ToolConfirmationComponent`.
- Build via `scripts/build.mjs` → `ng-packagr` (APF / FESM2022 + `.d.ts`);
  monorepo/packed consumers use dist-prefixed root exports; nested
  `dist/package.json` is pure APF (no `./dist/` prefixes).

## What does NOT belong here

- Non-Angular framework wrappers → `@agentskit/react`, `vue`, `svelte`, `solid`,
  `react-native`, `ink`
- Provider adapters → `@agentskit/adapters`
- Autonomous runtime → `@agentskit/runtime`
- Anything that only runs on Node

## Service conventions

1. Call `init(config)` in the component **constructor** (not `ngOnInit`) so the
   signal is populated before the first change-detection pass.
2. Tear down via `ngOnDestroy` / `destroy()` — unsubscribe + `stop()`; both are
   idempotent. Re-`init()` destroys any prior controller first.
3. Prefer Signal reads (`chat.state()`) in templates; use `stream$` only when
   piping through RxJS operators.
4. Async actions must return the underlying controller Promise (no fire-and-forget
   wrapping that drops the Promise).
5. `deny` must forward the optional `reason` argument.
6. Do not reimplement controller logic — wrap `createChatController` only.

## Component conventions

1. Components stay **standalone** with inline templates; publish as partial-Ivy AOT.
2. Headless: `data-ak-*` attributes only — no hardcoded colors or theme CSS.
3. Do not set redundant ARIA roles (e.g. `role="textbox"` on `<textarea>`).
4. `InputBar` blocks submit + Enter while `status === 'streaming'`.
5. `ToolCallView` exposes `aria-expanded` on the toggle.
6. Mirror the React component set; do not invent Angular-only chat primitives
   without a matching binding elsewhere.
7. Re-export every public symbol from `src/index.ts`.

## Testing

- Vitest + happy-dom; `tests/setup.ts` boots Angular TestBed + `zone.js`.
- Configured line coverage threshold: **70** (beta floor).
- Service tests cover pre-init throws, reinit teardown, full action forwarding
  (including edit/regenerate/deny reason), Promise returns, and state/stream nulling.
- Component tests use TestBed. AOT packaging is covered by
  `tests/package-aot.test.ts` against the built package + nested APF manifest.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Calling `init()` in `ngOnInit` | Call in the constructor to avoid CD timing errors |
| Putting monorepo `./dist/...` paths in raw `exports` for ng-packagr to copy | Use `scripts/build.mjs` so nested APF stays clean |
| Writing to `stdout` from library code | Keep the package silent; consumers own logging |
| Hardcoding theme styles in templates | Stay headless; expose `data-ak-*` only |
| Pulling adapter SDK code into this package | Depend on `@agentskit/core` + consumer-supplied adapters |
| Forgetting `ngOnDestroy` cleanup | Always unsubscribe / `destroy()` the controller |

## Review checklist for this package

- [ ] Coverage threshold holds (70% lines)
- [ ] `AgentskitChat` still exposes the shared `ChatReturn` action surface
- [ ] Components remain headless (`data-ak-*`, no theme CSS)
- [ ] Peers stay framework-only (`@angular/core`, `rxjs`)
- [ ] AOT / packagr build still produces FESM + types; nested APF has no `./dist/` prefixes
- [ ] Root package.json keeps dist-prefixed exports for packed consumers
- [ ] Works with a mock adapter in tests
