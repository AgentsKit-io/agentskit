import React from 'react'

/** Props for showing a labeled thinking indicator. */
export interface ThinkingIndicatorProps {
  visible: boolean
  label?: string
}

/**
 * Render a thinking indicator when `visible` is true.
 * @param props The visibility flag and optional label.
 * @returns The indicator element or `null`.
 */
export function ThinkingIndicator({ visible, label = 'Thinking...' }: ThinkingIndicatorProps) {
  if (!visible) return null

  return (
    <div data-ak-thinking="" data-testid="ak-thinking">
      <span data-ak-thinking-dots="">
        <span>&bull;</span><span>&bull;</span><span>&bull;</span>
      </span>
      <span data-ak-thinking-label="">{label}</span>
    </div>
  )
}
