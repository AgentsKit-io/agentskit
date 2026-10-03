import type { Component } from 'svelte'

/** Show a labeled thinking indicator when `visible` is true. */
declare const ThinkingIndicator: Component<{ visible: boolean; label?: string }>
export default ThinkingIndicator
