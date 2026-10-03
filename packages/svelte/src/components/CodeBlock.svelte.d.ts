import type { Component } from 'svelte'

/** Render a code block and optionally expose a clipboard copy button. */
declare const CodeBlock: Component<{ code: string; language?: string; copyable?: boolean }>
export default CodeBlock
