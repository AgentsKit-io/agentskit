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

function stripTerminalControls(input: string): string {
  let output = ''
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    if (code === 0x1b) {
      const next = input.charCodeAt(index + 1)
      if (next === 0x5d) {
        index += 2
        while (index < input.length) {
          const current = input.charCodeAt(index)
          if (current === 0x07) break
          if (current === 0x1b && input.charCodeAt(index + 1) === 0x5c) {
            index += 1
            break
          }
          index += 1
        }
      } else if (next === 0x5b) {
        index += 2
        while (index < input.length && !(input.charCodeAt(index) >= 0x40 && input.charCodeAt(index) <= 0x7e)) {
          index += 1
        }
      } else {
        index += 1
      }
      continue
    }
    if ((code >= 0 && code <= 8) || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f) || (code >= 0x7f && code <= 0x9f)) continue
    output += input[index]
  }
  return output
}

/**
 * Renders markdown (incl. tables, code blocks, links) to ANSI-styled text.
 * Delegates parsing to `marked` and terminal rendering to `marked-terminal`;
 * Ink's `<Text>` passes ANSI escapes through untouched.
 */
export function MarkdownText({ content }: MarkdownTextProps) {
  const rendered = useMemo(() => {
    try {
      const output = marked.parse(stripTerminalControls(content), { async: false }) as string
      return output.replace(/\n+$/, '')
    } catch {
      return content
    }
  }, [content])

  return <Text>{rendered}</Text>
}
