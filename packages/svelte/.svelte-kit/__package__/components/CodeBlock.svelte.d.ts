import type { Component } from 'svelte'

declare const CodeBlock: Component<{ code: string; language?: string; copyable?: boolean }>
export default CodeBlock
