# Conventions — `@agentskit/svelte`

Svelte 5 binding for the shared `ChatReturn` contract. Store-based state API
plus eight headless `.svelte` components.

Peer: `svelte ^5`. Published as ESM with a `svelte` export condition; built
with `@sveltejs/package`.

## Scope

- **`createChatStore(config)`** — returns `SvelteChatStore`: a
  `Readable<ChatState>` (`subscribe` / `$chat`) plus actions
  (`send`, `setInput`, `stop`, `retry`, `clear`, `approve`, `deny`, …) and
  `destroy()`
- **Headless components** (Svelte 5, `data-ak-*` only): `ChatContainer`,
  `Message`, `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`,
  `ThinkingIndicator`, `ToolConfirmation`
- Source layout: store logic in `src/useChat.ts`; components under
  `src/components/*.svelte` (+ colocated `.d.ts` shims)

## What does NOT belong here

- Other framework wrappers → `@agentskit/react`, `vue`, `solid`, `angular`,
  `react-native`, `ink`
- Provider adapters or runtime orchestration
- Hardcoded theme CSS inside components
- Browser-only side effects at module top level (SSR components must render)

## Store conventions

1. State is a Svelte store — consumers use `$chat` for fields and call actions
   on the store object (`chat.send(...)`).
2. Always expose `destroy()` and document calling it from `onDestroy` when the
   host does not auto-dispose.
3. Do not reimplement controller logic — wrap `createChatController`.
4. Named exports for TS helpers (`createChatStore`); Svelte components use the
   framework's default-export component modules (re-exported as named bindings
   from `src/index.ts`).

## Component conventions

1. Keep components headless — `data-ak-*` attributes only.
2. Prefer Svelte 5 runes-friendly props; stay compatible with `$chat`
   auto-subscription patterns.
3. Packaged components must remain SSR-renderable; start browser-bound adapters
   in `onMount` or behind a server proxy.

## Testing

- `pnpm test` builds first, then runs client vitest (`components` + `store`)
  and a separate SSR config (`vitest.ssr.config.ts`).
- Configured line coverage threshold: **70** (beta floor; coverage focuses on
  `.ts` — `.svelte` is exercised via component/SSR tests).
- Use `@testing-library/svelte` + happy-dom for client tests.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Forgetting `chat.destroy()` | Call from `onDestroy` to abort streams |
| Starting network adapters during SSR | Defer to `onMount` or a server endpoint |
| Adding CJS dual-publish without need | Package is ESM + `svelte` condition by design |
| Hardcoding styles in `.svelte` files | Stay headless; `data-ak-*` only |
| Diverging action names from `ChatReturn` | Keep parity with core / React bindings |

## Review checklist for this package

- [ ] Coverage threshold holds (70% lines)
- [ ] Client + SSR test configs both pass
- [ ] `createChatStore` still matches the shared action surface
- [ ] Components remain headless (`data-ak-*`)
- [ ] `destroy()` is documented and tested
- [ ] Peer stays `svelte ^5`
