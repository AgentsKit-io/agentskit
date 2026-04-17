import React, { useMemo } from 'react'
import { Text } from 'ink'
import { Marked } from 'marked'
import { markedTerminal } from 'marked-terminal'

export interface MarkdownTextProps {
  content: string
}

/**
 * One shared Marked instance — creating it per render forces the terminal
 * renderer to re-register its hooks every time.
 */
const marked = new Marked()
marked.use(
  markedTerminal({
    width: 80,
    reflowText: true,
    tab: 2,
  }) as unknown as Parameters<typeof marked.use>[0]
)

/**
 * Renders markdown (incl. tables, code blocks, links) to ANSI-styled text.
 * Delegates parsing to `marked` and terminal rendering to `marked-terminal`;
 * Ink's `<Text>` passes ANSI escapes through untouched.
 */
export function MarkdownText({ content }: MarkdownTextProps) {
  const rendered = useMemo(() => {
    try {
      const output = marked.parse(content, { async: false }) as string
      return output.replace(/\n+$/, '')
    } catch {
      return content
    }
  }, [content])

  return <Text>{rendered}</Text>
}
