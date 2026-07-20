# Conventions — `@agentskit/vue`

Vue 3 binding for the shared `ChatReturn` contract. Composition-API composable
plus headless components using `data-ak-*` attributes.

Peer: `vue ^3.4`.

## Scope

- **`useChat(config)`** — Vue composable via `reactive()` + auto-cleanup on
  scope dispose (`onScopeDispose`)
- **`<ChatContainer>`** — batteries-included headless container (`data-ak-*`)
- **`<ChatRoot>`** — controller-free `data-ak-chat` root for composing an
  application shell around an existing `useChat` result
- **Headless primitives**: `Message`, `InputBar`, `Markdown`, `CodeBlock`,
  `ToolCallView`, `ThinkingIndicator`, `ToolConfirmation`
- Dual CJS/ESM build via tsup

## What does NOT belong here

- Options API support — Composition API / `<script setup>` only
- Other framework wrappers → `@agentskit/react`, `svelte`, `solid`, `angular`,
  `react-native`, `ink`
- Provider adapters or autonomous runtime
- Hardcoded theme CSS inside components

## Composable conventions

1. Must be called inside `setup()` / `<script setup>` so the effect scope owns
   cleanup.
2. Return a reactive object — consumers must **not** destructure
   (`const { messages } = useChat(...)` loses reactivity).
3. Do not introduce global state; each call owns its controller.
4. Re-export from `src/index.ts`.

## Component conventions

1. Headless only — `data-ak-*` attributes for styling hooks; no color tokens.
2. Keep parity with the React primitive set; document any intentional extras
   (`ChatRoot`, batteries `ChatContainer`).
3. Prefer functional / `defineComponent` patterns already used in `src/`; stay
   tree-shakeable.
4. SSR / Nuxt: adapters make network calls from the browser — document
   `<ClientOnly>` / `ssr: false` usage; do not pretend the composable is
   server-safe.

## Testing

- Vitest + happy-dom.
- Configured line coverage threshold: **90**.
- Cover composable reactivity, cleanup, and component `data-ak-*` rendering
  with a mock adapter.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Destructure the `useChat` return | Access `chat.messages` / `chat.input` on the reactive object |
| Calling `useChat` outside `setup` | Keep it in `<script setup>` / `setup()` |
| Hardcoding styles | `data-ak-*` + consumer CSS |
| Running the composable during Nuxt SSR | Wrap with `<ClientOnly>` or disable SSR for that tree |
| Diverging action names from `ChatReturn` | Stay aligned with core / React |

## Review checklist for this package

- [ ] Coverage threshold holds (90% lines)
- [ ] `useChat` still matches the shared `ChatReturn` surface
- [ ] Components remain headless (`data-ak-*`)
- [ ] No Options API surface is introduced
- [ ] Cleanup runs on scope dispose
- [ ] Works with a mock adapter in tests
