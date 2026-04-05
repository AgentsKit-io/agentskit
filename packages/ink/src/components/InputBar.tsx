import React from 'react'
import { Box, Text, useInput } from 'ink'
import type { ChatReturn } from '@agentskit/core'

export interface InputBarProps {
  chat: ChatReturn
  placeholder?: string
  disabled?: boolean
}

export function InputBar({ chat, placeholder = 'Type a message...', disabled = false }: InputBarProps) {
  useInput((input, key) => {
    if (disabled || chat.status === 'streaming') return

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

  return (
    <Box flexDirection="column">
      <Text dimColor>{placeholder}</Text>
      <Text color={disabled ? 'gray' : 'white'}>
        &gt; {chat.input}
      </Text>
    </Box>
  )
}
