import type { Component } from 'svelte'

declare const Markdown: Component<{ content: string; streaming?: boolean }>
export default Markdown
