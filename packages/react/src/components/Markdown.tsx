import React from 'react'

/** Props for displaying message content with a streaming marker. */
export interface MarkdownProps {
  content: string
  streaming?: boolean
}

/**
 * Display content as text and mark it while the response is streaming.
 * @param props The content and optional streaming state.
 * @returns The marked content element.
 */
export function Markdown({ content, streaming = false }: MarkdownProps) {
  return (
    <div data-ak-markdown="" data-ak-streaming={streaming ? 'true' : undefined}>
      {content}
    </div>
  )
}
