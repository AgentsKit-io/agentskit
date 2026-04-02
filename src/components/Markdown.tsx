import React from 'react'

export interface MarkdownProps {
  content: string
  streaming?: boolean
}

export function Markdown({ content, streaming = false }: MarkdownProps) {
  return (
    <div data-ra-markdown="" data-ra-streaming={streaming ? 'true' : undefined}>
      {content}
    </div>
  )
}
