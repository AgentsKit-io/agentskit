import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { MarkdownText } from '../src/components/MarkdownText'
import { InputBar } from '../src/components/InputBar'

describe('Ink trust boundaries', () => {
  it('does not pass terminal control sequences from content to the terminal', () => {
    const { lastFrame } = render(<MarkdownText content={'safe\u001b]0;owned-title\u0007\u001b[31m text'} />)
    expect(lastFrame()).toContain('safe')
    expect(lastFrame()).not.toContain('owned-title')
    expect(lastFrame()).not.toContain('\u001b')
  })

  it('handles rejected input hooks without an unhandled rejection', async () => {
    const setInput = vi.fn()
    const chat = { input: 'command', messages: [], status: 'idle', setInput, send: vi.fn(), stop: vi.fn() } as never
    const onSubmitInput = vi.fn().mockRejectedValue(new Error('hook failed'))
    const { stdin } = render(<InputBar chat={chat} onSubmitInput={onSubmitInput} />)
    stdin.write('\r')
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(setInput).toHaveBeenLastCalledWith('command')
  })
})
