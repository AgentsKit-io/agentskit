import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'

export interface ThinkingIndicatorProps {
  visible: boolean
  label?: string
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const FRAME_MS = 80

export function ThinkingIndicator({ visible, label = 'Thinking' }: ThinkingIndicatorProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      setFrame(f => (f + 1) % SPINNER_FRAMES.length)
    }, FRAME_MS)
    return () => clearInterval(id)
  }, [visible])

  if (!visible) return null

  return (
    <Box>
      <Text color="cyan">{SPINNER_FRAMES[frame]} </Text>
      <Text dimColor italic>
        {label}
      </Text>
    </Box>
  )
}
