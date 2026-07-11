import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import type { Message as MessageType, ChatReturn, ToolCall } from '@agentskit/core'
import {
  ChatContainer,
  CodeBlock,
  InputBar,
  Markdown,
  Message,
  ThinkingIndicator,
  ToolCallView,
  ToolConfirmation,
} from '../src/components'

function makeMessage(overrides: Partial<MessageType> = {}): MessageType {
  return {
    id: 'm1',
    role: 'assistant',
    content: 'hello world',
    status: 'complete',
    createdAt: new Date(),
    ...overrides,
  }
}

function makeToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id: 't1',
    name: 'search',
    args: { query: 'cats' },
    status: 'pending',
    ...overrides,
  }
}

function makeChat(overrides: Partial<ChatReturn> = {}): ChatReturn {
  return {
    messages: [],
    status: 'idle',
    input: '',
    error: null,
    usage: undefined,
    send: vi.fn(),
    setInput: vi.fn(),
    stop: vi.fn(),
    retry: vi.fn(),
    clear: vi.fn(),
    approve: vi.fn(),
    deny: vi.fn(),
    edit: vi.fn(),
    regenerate: vi.fn(),
    ...overrides,
  } as ChatReturn
}

describe('ChatContainer', () => {
  it('renders children inside the scroll container', () => {
    const { getByTestId } = render(
      <ChatContainer>
        <Message message={makeMessage()} />
      </ChatContainer>,
    )
    expect(getByTestId('ak-chat-container')).toBeTruthy()
    expect(getByTestId('ak-message')).toBeTruthy()
  })
})

describe('Message', () => {
  it('renders content with role/status accessibility label', () => {
    const { getByTestId } = render(<Message message={makeMessage({ role: 'user', status: 'streaming' })} />)
    const el = getByTestId('ak-message')
    expect(el.getAttribute('aria-label')).toBe('user message (streaming)')
    expect(getByTestId('ak-content').textContent).toBe('hello world')
  })

  it('renders avatar and actions slots when provided', () => {
    const { getByTestId } = render(
      <Message message={makeMessage()} avatar={<span>A</span>} actions={<span>act</span>} />,
    )
    expect(getByTestId('ak-avatar')).toBeTruthy()
    expect(getByTestId('ak-actions')).toBeTruthy()
  })

  it('forwards content styles to the native text primitive', () => {
    const { getByTestId } = render(<Message message={makeMessage()} contentStyle={{ color: '#ffffff', fontFamily: 'Brand Sans' }} />)
    expect(getByTestId('ak-content').style.color).toBe('#ffffff')
    expect(getByTestId('ak-content').style.fontFamily).toContain('Brand Sans')
  })
})

describe('InputBar', () => {
  it('forwards input styles to the native text input', () => {
    const { getByTestId } = render(<InputBar chat={makeChat()} inputStyle={{ color: '#111827', fontFamily: 'Brand Sans' }} />)
    expect(getByTestId('ak-input').style.fontFamily).toContain('Brand Sans')
  })

  it('sends on submit and reflects input value', () => {
    const send = vi.fn()
    const chat = makeChat({ input: 'hi there', send })
    const { getByTestId } = render(<InputBar chat={chat} />)
    fireEvent.keyDown(getByTestId('ak-input'), { key: 'Enter' })
    expect(send).toHaveBeenCalledWith('hi there')
  })

  it('calls setInput on change', () => {
    const setInput = vi.fn()
    const chat = makeChat({ setInput })
    const { getByTestId } = render(<InputBar chat={chat} />)
    fireEvent.change(getByTestId('ak-input'), { target: { value: 'draft' } })
    expect(setInput).toHaveBeenCalledWith('draft')
  })

  it('disables send when input empty', () => {
    const chat = makeChat({ input: '   ' })
    const { getByTestId } = render(<InputBar chat={chat} />)
    expect((getByTestId('ak-send') as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables send and input while streaming', () => {
    const chat = makeChat({ input: 'ready', status: 'streaming' })
    const { getByTestId } = render(<InputBar chat={chat} />)
    expect((getByTestId('ak-send') as HTMLButtonElement).disabled).toBe(true)
    expect((getByTestId('ak-input') as HTMLInputElement).disabled).toBe(true)
  })

  it('sends on Send press when input present', () => {
    const send = vi.fn()
    const chat = makeChat({ input: 'go', send })
    const { getByTestId } = render(<InputBar chat={chat} />)
    fireEvent.click(getByTestId('ak-send'))
    expect(send).toHaveBeenCalledWith('go')
  })

  it('does not send empty input on submit', () => {
    const send = vi.fn()
    const chat = makeChat({ input: '   ', send })
    const { getByTestId } = render(<InputBar chat={chat} />)
    fireEvent.keyDown(getByTestId('ak-input'), { key: 'Enter' })
    expect(send).not.toHaveBeenCalled()
  })
})

describe('Markdown', () => {
  it('renders content and streaming label', () => {
    const { getByTestId, rerender } = render(<Markdown content="# hi" />)
    expect(getByTestId('ak-markdown').textContent).toBe('# hi')
    expect(getByTestId('ak-markdown').getAttribute('aria-label')).toBe('markdown')
    rerender(<Markdown content="# hi" streaming />)
    expect(getByTestId('ak-markdown').getAttribute('aria-label')).toBe('streaming markdown')
  })
})

describe('CodeBlock', () => {
  it('renders code and no copy button by default', () => {
    const { getByTestId, queryByTestId } = render(<CodeBlock code="const x = 1" language="ts" />)
    expect(getByTestId('ak-code').textContent).toBe('const x = 1')
    expect(getByTestId('ak-code-block').getAttribute('aria-label')).toBe('code block (ts)')
    expect(queryByTestId('ak-copy')).toBeNull()
  })

  it('invokes onCopy when copyable copy is pressed', () => {
    const onCopy = vi.fn()
    const { getByTestId } = render(<CodeBlock code="x" copyable onCopy={onCopy} />)
    fireEvent.click(getByTestId('ak-copy'))
    expect(onCopy).toHaveBeenCalledWith('x')
  })

  it('copy without onCopy does not throw', () => {
    const { getByTestId } = render(<CodeBlock code="x" copyable />)
    expect(() => fireEvent.click(getByTestId('ak-copy'))).not.toThrow()
  })
})

describe('ToolCallView', () => {
  it('toggles details on press', () => {
    const { getByTestId, queryByTestId } = render(<ToolCallView toolCall={makeToolCall()} />)
    expect(queryByTestId('ak-tool-details')).toBeNull()
    fireEvent.click(getByTestId('ak-tool-toggle'))
    expect(getByTestId('ak-tool-details')).toBeTruthy()
    expect(getByTestId('ak-tool-args').textContent).toContain('query')
    fireEvent.click(getByTestId('ak-tool-toggle'))
    expect(queryByTestId('ak-tool-details')).toBeNull()
  })

  it('shows result when expanded and present', () => {
    const { getByTestId } = render(
      <ToolCallView toolCall={makeToolCall({ status: 'complete', result: 'found 3' })} />,
    )
    fireEvent.click(getByTestId('ak-tool-toggle'))
    expect(getByTestId('ak-tool-result').textContent).toBe('found 3')
  })
})

describe('ThinkingIndicator', () => {
  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(<ThinkingIndicator visible={false} />)
    expect(queryByTestId('ak-thinking')).toBeNull()
  })

  it('renders label when visible', () => {
    const { getByTestId } = render(<ThinkingIndicator visible label="Working" />)
    expect(getByTestId('ak-thinking-label').textContent).toBe('Working')
  })
})

describe('ToolConfirmation', () => {
  it('returns null unless status requires confirmation', () => {
    const { queryByTestId } = render(
      <ToolConfirmation toolCall={makeToolCall()} onApprove={vi.fn()} onDeny={vi.fn()} />,
    )
    expect(queryByTestId('ak-tool-confirmation')).toBeNull()
  })

  it('renders and wires approve / deny when confirmation required', () => {
    const onApprove = vi.fn()
    const onDeny = vi.fn()
    const toolCall = makeToolCall({ status: 'requires_confirmation' })
    const { getByTestId } = render(
      <ToolConfirmation toolCall={toolCall} onApprove={onApprove} onDeny={onDeny} />,
    )
    expect(getByTestId('ak-tool-confirmation-name').textContent).toBe('search')
    fireEvent.click(getByTestId('ak-tool-confirmation-approve'))
    expect(onApprove).toHaveBeenCalledWith('t1')
    fireEvent.click(getByTestId('ak-tool-confirmation-deny'))
    expect(onDeny).toHaveBeenCalledWith('t1')
  })
})
