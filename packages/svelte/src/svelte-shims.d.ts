declare module '*.svelte' {
  import type { Component } from 'svelte'
  // Loose component type so `tsc --noEmit` accepts `.svelte` imports in `.ts`
  // barrels. Consumers get precise prop types from the compiled `.svelte.d.ts`.
  const component: Component<Record<string, unknown>>
  export default component
}
