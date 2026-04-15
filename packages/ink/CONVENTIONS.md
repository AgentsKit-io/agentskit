# Conventions — `@agentskit/ink`

Terminal UI components for AgentsKit. Mirrors `@agentskit/react`'s surface but for Ink.

## Scope

- **Ink components** — `ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, `ToolCallView`
- **Ink hooks** — thin wrappers around `@agentskit/core` primitives for Ink-friendly consumption
- Input handling that respects terminal raw-mode semantics

## What does NOT belong here

- React DOM components → `@agentskit/react`
- Autonomous runtime → `@agentskit/runtime`
- Anything requiring a DOM

## Adding a new component

1. Create `src/components/<Name>.tsx`. PascalCase.
2. Use only `ink` primitives — `Box`, `Text`, `useInput`, `useFocus`, etc.
3. No ANSI escape codes in component logic; let `ink` handle rendering.
4. Re-export from `src/components/index.ts` and from `src/index.ts`.

## Input handling

- Use `ink`'s `useInput` hook. Do not read stdin directly.
- Gate input on `chat.status` — block input while `streaming`.
- Respect the `disabled` prop everywhere a component accepts user input.

## Testing

- `ink-testing-library@4` does **not** route stdin through `ink@7`'s input pipeline. Keyboard-input tests must mock `useInput` directly:

  ```tsx
  let captured: ((input: string, key: Key) => void) | undefined
  vi.mock('ink', async () => {
    const actual = await vi.importActual<typeof import('ink')>('ink')
    return {
      ...actual,
      useInput: (handler) => { captured = handler },
    }
  })

  // In tests, call captured!(input, key) directly.
  ```

- Rendering-only tests work fine with `ink-testing-library`.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Writing ANSI codes manually | Use `Text color={...}` |
| Reading stdin directly | Use `useInput` |
| Forgetting to gate input on `streaming` | Check `chat.status !== 'streaming'` before every action |
| Assuming 80 columns | Use `useStdout` and `rows`/`columns` from it |

## Review checklist for this package

- [ ] Bundle size under 15KB gzipped
- [ ] Coverage threshold holds (60% lines)
- [ ] Uses `ink` primitives only (no raw ANSI)
- [ ] Keyboard tests mock `useInput` per the pattern above
- [ ] Works in narrow terminals (test at 40 columns)
