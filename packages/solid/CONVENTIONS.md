# Conventions — `@agentskit/solid`

SolidJS binding for the shared `ChatReturn` contract. Store-backed hook plus
eight headless components using `data-ak-*` attributes.

Peer: `solid-js ^1.8`.

## Scope

- **`useChat(config)`** — Solid hook via `createStore` + `onCleanup`, returning
  the shared `ChatReturn` shape through a reactive proxy
- **Headless components** (`data-ak-*` only): `ChatContainer`, `Message`,
  `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`,
  `ToolConfirmation`
- Dual CJS/ESM build via tsup + Solid JSX transform

## What does NOT belong here

- Other framework wrappers → `@agentskit/react`, `vue`, `svelte`, `angular`,
  `react-native`, `ink`
- Provider adapters → `@agentskit/adapters`
- Autonomous runtime, tools, or Node-only packages
- Hardcoded theme CSS inside components

## Hook conventions

1. Wire cleanup with Solid's `onCleanup` (unsubscribe + stop in-flight work).
2. Do not destructure reactive fields away from the store proxy — consumers
   read `chat.messages` inside JSX tracking scopes.
3. Do not introduce global state; each `useChat` owns its controller.
4. Re-export from `src/index.ts`.

## Component conventions

1. Components live under `src/components/<Name>.tsx` (PascalCase).
2. Headless only — `data-ak-*` attributes for styling hooks; no color tokens.
3. Export props types as `<Name>Props`.
4. Keep the eight-component parity set aligned with React; extras need an
   explicit cross-binding decision.

## Testing

- Vitest + happy-dom + `vite-plugin-solid` / `@solidjs/testing-library`.
- Configured line coverage threshold: **70** (beta floor).
- Prefer observable UI behavior over internal store structure.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Destructure `const { messages } = useChat(...)` | Access fields through the reactive return value |
| Skipping `onCleanup` | Always tear down subscriptions and stop streams |
| Copying React `useEffect` patterns blindly | Use Solid primitives (`createEffect`, `onCleanup`) |
| Hardcoding styles | `data-ak-*` + consumer CSS |
| Client-only hook under SolidStart SSR without a guard | Document client-only usage / wrap appropriately |

## Review checklist for this package

- [ ] Coverage threshold holds (70% lines)
- [ ] `useChat` still matches the shared `ChatReturn` surface
- [ ] Components remain headless (`data-ak-*`)
- [ ] Solid JSX build/transform still works under vitest
- [ ] Cleanup runs on dispose
- [ ] Works with a mock adapter in tests
