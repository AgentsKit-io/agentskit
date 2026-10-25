import React, { type ReactNode } from 'react'
import { Box } from 'ink'

/** Children rendered in a vertical terminal chat layout. */
export interface ChatContainerProps {
  children: ReactNode
}

/** Render chat children as a vertical Ink box.
 * @param props The child elements to arrange.
 * @returns A column-oriented Ink box.
 * @example
 * ```tsx
 * <ChatContainer><Message message={message} /></ChatContainer>
 * ```
 */
export function ChatContainer({ children }: ChatContainerProps) {
  return (
    <Box flexDirection="column" gap={1}>
      {children}
    </Box>
  )
}
