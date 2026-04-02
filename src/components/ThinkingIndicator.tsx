import React from 'react'

export interface ThinkingIndicatorProps {
  visible: boolean
  label?: string
}

export function ThinkingIndicator({ visible, label = 'Thinking...' }: ThinkingIndicatorProps) {
  if (!visible) return null

  return (
    <div data-ra-thinking="" data-testid="ra-thinking">
      <span data-ra-thinking-dots="">
        <span>&bull;</span><span>&bull;</span><span>&bull;</span>
      </span>
      <span data-ra-thinking-label="">{label}</span>
    </div>
  )
}
