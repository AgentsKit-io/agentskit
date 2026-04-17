import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { ToolCall } from '@agentskit/core'

export interface ToolConfirmationProps {
  toolCall: ToolCall
  onApprove: (toolCallId: string) => void
  onDeny: (toolCallId: string, reason?: string) => void
  /**
   * Called when the user picks "allow for this session" — approves the
   * current call and signals that further calls with this tool name should
   * run without prompting.
   */
  onApproveAlways?: (toolCallId: string, toolName: string) => void
}

type Choice = 'allow_once' | 'allow_session' | 'deny'

interface Option {
  key: Choice
  label: string
  hint: string
  color: string
}

const OPTIONS: Option[] = [
  { key: 'allow_once', label: 'Yes', hint: 'allow this call', color: 'green' },
  { key: 'allow_session', label: 'Yes, for session', hint: 'stop asking for this tool', color: 'cyan' },
  { key: 'deny', label: 'No', hint: 'deny and tell the model why', color: 'red' },
]

export function ToolConfirmation({
  toolCall,
  onApprove,
  onDeny,
  onApproveAlways,
}: ToolConfirmationProps) {
  const [index, setIndex] = useState(0)
  const active = toolCall.status === 'requires_confirmation'

  useInput((input, key) => {
    if (!active) return

    if (key.upArrow || (key.shift && key.tab)) {
      setIndex(i => (i - 1 + OPTIONS.length) % OPTIONS.length)
      return
    }
    if (key.downArrow || key.tab) {
      setIndex(i => (i + 1) % OPTIONS.length)
      return
    }

    if (key.return) {
      const choice = OPTIONS[index].key
      if (choice === 'allow_once') onApprove(toolCall.id)
      else if (choice === 'allow_session') {
        if (onApproveAlways) onApproveAlways(toolCall.id, toolCall.name)
        else onApprove(toolCall.id)
      }
      else onDeny(toolCall.id)
      return
    }

    // Numeric shortcuts for quick picking.
    if (input === '1') { setIndex(0); onApprove(toolCall.id) }
    else if (input === '2') {
      setIndex(1)
      if (onApproveAlways) onApproveAlways(toolCall.id, toolCall.name)
      else onApprove(toolCall.id)
    }
    else if (input === '3') { setIndex(2); onDeny(toolCall.id) }
  })

  if (!active) return null

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} borderColor="yellow">
      <Text color="yellow" bold>
        ⚠  Allow {toolCall.name}?
      </Text>
      <Text dimColor>{JSON.stringify(toolCall.args)}</Text>
      <Box flexDirection="column" marginTop={1}>
        {OPTIONS.map((opt, i) => {
          const selected = i === index
          return (
            <Box key={opt.key}>
              <Text color={selected ? opt.color : 'gray'}>
                {selected ? '❯ ' : '  '}
              </Text>
              <Text color={selected ? opt.color : 'white'} bold={selected}>
                {i + 1}. {opt.label}
              </Text>
              <Text dimColor>  — {opt.hint}</Text>
            </Box>
          )
        })}
      </Box>
      <Text dimColor>↑/↓ to move, Enter to pick, 1–3 for shortcuts</Text>
    </Box>
  )
}
