# Conventions — `@agentskit/react`

React hooks and headless UI components for AgentsKit. Everything here runs in a browser.

## Scope

- **Hooks** — `useChat`, `useStream`, `useReactive`, and any future reactive primitives
- **Headless UI components** — `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, `ToolCallView`, `Confirmation`, `CodeBlock`
- **Theme CSS** — a single opinionated default theme at `@agentskit/react/theme`

## What does NOT belong here

- Any non-React framework wrapper → its own package (`@agentskit/vue`, `@agentskit/svelte`, etc.)
- Provider adapters → `@agentskit/adapters`
- Autonomous runtime — `@agentskit/runtime`
- Anything that only runs on Node → `@agentskit/memory`, `@agentskit/tools`, etc.

## Adding a new component

1. Create `src/components/<Name>.tsx`. Name the file and the component in PascalCase.
2. The component must be **headless** — no hardcoded styles beyond what's needed for layout. Use `data-ak-*` attributes for styling hooks.
3. Props interface: `<Name>Props`, exported.
4. Accept a `className` prop always.
5. Accept `children` where composition is useful; otherwise keep the surface minimal.
6. Re-export from `src/components/index.ts` and from `src/index.ts`.

## Adding a new hook

1. Create `src/<hookName>.ts` or a subdir if there are supporting files.
2. Return a typed object — never tuples for more than 2 values.
3. Name fields clearly: `messages`, `status`, `send`, `stop`, `retry` are conventions already in use.
4. Do not introduce global state. Hooks are self-contained.
5. Re-export from `src/index.ts`.

## Styling conventions

- Use `data-ak-*` attributes, not class names, for targeting:
  ```tsx
  <div data-ak-message data-ak-message-role={role}>
  ```
- The theme at `src/theme.css` provides defaults. Consumers can override via CSS variables.
- Do not import CSS inside a component file. Let consumers opt in via `import '@agentskit/react/theme'`.

## Testing

- Use `@testing-library/react` + `happy-dom` (already configured).
- Test observable behavior: what the user sees, not what the component does internally.
- Use a mock `AdapterFactory` (see [Recipe: Custom adapter](../../apps/docs-next/content/docs/recipes/custom-adapter.mdx)) for hook tests.
- Snapshot tests for components are acceptable; snapshot tests for LLM output are not.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Hardcoding colors in component styles | Use CSS variables defined in the theme |
| Pulling in a UI library (MUI, Chakra, etc.) as a dep | Keep components headless; let consumers wire their own UI |
| Reaching into `@agentskit/core` internals | Use only the public exports |
| Making a hook that returns a 5-tuple | Return an object |
| Side effects in render | Move to `useEffect` |

## Accessibility

Every interactive component must:

- Be keyboard-reachable (Tab focus, Enter activation)
- Expose ARIA attributes for role and state
- Not trap focus unless explicitly modal

## Review checklist for this package

- [ ] Bundle size under 15KB gzipped
- [ ] Coverage threshold holds (80% lines)
- [ ] No hardcoded colors or fonts
- [ ] `data-ak-*` attributes for styling hooks
- [ ] Works with a mock adapter in tests
- [ ] Keyboard and screen-reader accessible
