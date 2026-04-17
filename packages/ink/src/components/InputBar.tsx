import React, { useEffect, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { ChatReturn } from '@agentskit/core'

export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}

const CURSOR_MS = 500

export function InputBar({ chat, placeholder = 'Type a message...', disabled = false }: InputBarProps) {
  const isBusy = disabled || chat.status === 'streaming'
  const [cursorOn, setCursorOn] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), CURSOR_MS)
    return () => clearInterval(id)
  }, [])

  useInput((input, key) => {
    if (isBusy) return

    if (key.return) {
      if (chat.input.trim()) {
        void chat.send(chat.input)
      }
      return
    }

    if (key.backspace || key.delete) {
      chat.setInput(chat.input.slice(0, -1))
      return
    }

    if (input && !key.ctrl && !key.meta) {
      chat.setInput(`${chat.input}${input}`)
    }
  })

  const hint = isBusy
    ? chat.status === 'streaming'
      ? 'streaming response… press Ctrl+C to abort'
      : 'input disabled'
    : placeholder

  return (
    <Box flexDirection="column">
      <Text dimColor>{hint}</Text>
      <Box>
        <Text color={isBusy ? 'gray' : 'cyan'} bold>
          ❯{' '}
        </Text>
        <Text color={isBusy ? 'gray' : 'white'}>
          {chat.input}
          {!isBusy && cursorOn ? <Text inverse> </Text> : null}
        </Text>
      </Box>
    </Box>
  )
}
