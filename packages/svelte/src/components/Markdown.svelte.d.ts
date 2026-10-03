import type { Component } from 'svelte'

/** Display chat content with an optional streaming marker. */
declare const Markdown: Component<{ content: string; streaming?: boolean }>
export default Markdown
