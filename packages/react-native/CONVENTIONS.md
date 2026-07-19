# Conventions — `@agentskit/react-native`

React Native / Expo binding for the shared `ChatReturn` contract. Same hook
shape as `@agentskit/react`, rendered with RN primitives and `testID` hooks
instead of DOM `data-ak-*` attributes.

Peers: `react ^18 || ^19`, `react-native *`.

## Scope

- **`useChat(config)`** — pure React hook over `createChatController` (no DOM)
- **Headless components** on RN primitives (`View`, `Text`, `TextInput`,
  `ScrollView`, `Pressable`): `ChatContainer`, `Message`, `InputBar`,
  `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`,
  `ToolConfirmation`
- Styling hooks via stable **`testID`s** (`ak-message`, `ak-input`, `ak-send`,
  …) and `accessibilityLabel` for role/status — not `data-ak-*`

## What does NOT belong here

- DOM / web components → `@agentskit/react`
- Other framework bindings → `vue`, `svelte`, `solid`, `angular`, `ink`
- Provider adapters, runtime, tools, or Node-only backends
- Hardcoded `StyleSheet` themes or design-system colors

## Component conventions

1. Use only React Native primitives — no DOM APIs, no `document` / `window`
   assumptions.
2. Default `testID`s are part of the parity contract; keep names stable.
3. Accept optional `style` pass-through where the host primitive supports it;
   never hardcode colors.
4. Role and status go through accessibility props, not visual chrome.
5. Re-export from `src/index.ts` with matching `*Props` types.

## Platform notes

- Hermes lacks `TextDecoder` / Web Streams — consumers must polyfill before
  importing AgentsKit (document, don't silently swallow).
- Do not rely on Node built-ins (`Buffer`, `stream`, `crypto`); Metro will not
  polyfill them.
- Keep the package Metro- and Expo-safe: no Node-only imports in `src/`.

## Testing

- Vitest + happy-dom with `react-native` aliased to
  `tests/react-native.mock.tsx` (RN primitives do not render under happy-dom).
- Configured line coverage threshold: **70** (beta floor).
- Test observable behavior (rendered `testID`s, disabled states, send gating).
- Cover all send paths (press + `onSubmitEditing`), streaming/disabled gates,
  multi-instance isolation, and lifecycle under `StrictMode`.
- Metro/Hermes purity is asserted via static src scans in package tests —
  no extra Metro runtime dependency in this package.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Using `data-ak-*` like the web binding | Use `testID` / `accessibilityLabel` |
| Shipping a default color theme | Stay headless; optional `style` only |
| Importing DOM-only APIs | Keep the surface RN-pure |
| Assuming Streams / TextDecoder exist | Document polyfills; missing ones must fail predictably (not silently) |
| Treating this as a fork of `@agentskit/react` | Share the contract; do not copy web DOM code |

## Review checklist for this package

- [ ] Coverage threshold holds (70% lines)
- [ ] Components stay on RN primitives + stable `testID`s
- [ ] No hardcoded theme colors / StyleSheets
- [ ] `useChat` matches the shared `ChatReturn` action surface
- [ ] Tests use the RN mock alias, not a real native runtime
- [ ] No Node built-in imports in published source
