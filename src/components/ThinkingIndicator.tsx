import React from 'react'

export interface ThinkingIndicatorProps {
  visible: boolean
  label?: string
}

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
