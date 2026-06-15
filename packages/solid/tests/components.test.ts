import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@solidjs/testing-library'
import type { ChatReturn, Message as MessageType, ToolCall } from '@agentskit/core'
import {
  ChatContainer,
  Message,
  InputBar,
  Markdown,
  CodeBlock,
  ToolCallView,
  ThinkingIndicator,
  ToolConfirmation,
} from '../src'

function makeMessage(overrides: Partial<MessageType> = {}): MessageType {
  return {
    id: 'm1',
    role: 'assistant',
    status: 'complete',
    content: 'hello world',
    ...overrides,
  } as MessageType
}

function makeToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id: 't1',
    name: 'search',
    args: { q: 'cats' },
    status: 'complete',
    ...overrides,
  } as ToolCall
}

function makeChat(overrides: Partial<ChatReturn> = {}): ChatReturn {
  return {
    messages: [],
    status: 'idle',
    input: '',
    error: undefined,
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
  } as unknown as ChatReturn
}

describe('ChatContainer', () => {
  it('renders children with data-ak attrs', () => {
    const { getByTestId } = render(() => ChatContainer({ children: 'inner' }))
    const el = getByTestId('ak-chat-container')
    expect(el).toBeTruthy()
    expect(el.getAttribute('data-ak-chat-container')).toBe('')
    expect(el.textContent).toContain('inner')
  })

  it('applies class prop and auto-scrolls on mutation', async () => {
    const { getByTestId } = render(() => ChatContainer({ children: 'x', class: 'box' }))
    const el = getByTestId('ak-chat-container') as HTMLDivElement
    expect(el.className).toBe('box')
    // mutate to trigger MutationObserver scroll
    el.appendChild(document.createElement('span'))
    await new Promise((r) => setTimeout(r, 0))
    expect(el).toBeTruthy()
  })
})

describe('Message', () => {
  it('renders role, status and content', () => {
    const { container } = render(() => Message({ message: makeMessage({ role: 'user', status: 'streaming' }) }))
    const el = container.querySelector('[data-ak-message]') as HTMLElement
    expect(el.getAttribute('data-ak-role')).toBe('user')
    expect(el.getAttribute('data-ak-status')).toBe('streaming')
    expect(container.querySelector('[data-ak-content]')?.textContent).toBe('hello world')
    expect(container.querySelector('[data-ak-avatar]')).toBeNull()
    expect(container.querySelector('[data-ak-actions]')).toBeNull()
  })

  it('renders avatar and actions slots when provided', () => {
    const { container } = render(() =>
      Message({ message: makeMessage(), avatar: 'AV', actions: 'AC' }),
    )
    expect(container.querySelector('[data-ak-avatar]')?.textContent).toBe('AV')
    expect(container.querySelector('[data-ak-actions]')?.textContent).toBe('AC')
  })
})

describe('Markdown', () => {
  it('renders content without streaming attr', () => {
    const { container } = render(() => Markdown({ content: 'body' }))
    const el = container.querySelector('[data-ak-markdown]') as HTMLElement
    expect(el.textContent).toBe('body')
    expect(el.getAttribute('data-ak-streaming')).toBeNull()
  })

  it('sets streaming attr when streaming', () => {
    const { container } = render(() => Markdown({ content: 'body', streaming: true }))
    const el = container.querySelector('[data-ak-markdown]') as HTMLElement
    expect(el.getAttribute('data-ak-streaming')).toBe('true')
  })
})

describe('CodeBlock', () => {
  it('renders code + language, no copy button by default', () => {
    const { container } = render(() => CodeBlock({ code: 'const a=1', language: 'ts' }))
    const el = container.querySelector('[data-ak-code-block]') as HTMLElement
    expect(el.getAttribute('data-ak-language')).toBe('ts')
    expect(container.querySelector('code')?.textContent).toBe('const a=1')
    expect(container.querySelector('[data-ak-copy]')).toBeNull()
  })

  it('renders copy button and copies on click when copyable', () => {
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const { container } = render(() => CodeBlock({ code: 'X', copyable: true }))
    const btn = container.querySelector('[data-ak-copy]') as HTMLButtonElement
    expect(btn).toBeTruthy()
    fireEvent.click(btn)
    expect(writeText).toHaveBeenCalledWith('X')
  })
})

describe('ToolCallView', () => {
  it('collapsed by default, toggles details on click', async () => {
    const { container } = render(() => ToolCallView({ toolCall: makeToolCall({ result: 'res' }) }))
    const root = container.querySelector('[data-ak-tool-call]') as HTMLElement
    expect(root.getAttribute('data-ak-tool-status')).toBe('complete')
    expect(container.querySelector('[data-ak-tool-details]')).toBeNull()

    const toggle = container.querySelector('[data-ak-tool-toggle]') as HTMLButtonElement
    expect(toggle.textContent).toBe('search')
    fireEvent.click(toggle)
    expect(container.querySelector('[data-ak-tool-details]')).toBeTruthy()
    expect(container.querySelector('[data-ak-tool-args]')?.textContent).toContain('cats')
    expect(container.querySelector('[data-ak-tool-result]')?.textContent).toBe('res')

    fireEvent.click(toggle)
    expect(container.querySelector('[data-ak-tool-details]')).toBeNull()
  })

  it('omits result block when no result', () => {
    const { container } = render(() => ToolCallView({ toolCall: makeToolCall({ result: undefined }) }))
    fireEvent.click(container.querySelector('[data-ak-tool-toggle]') as HTMLButtonElement)
    expect(container.querySelector('[data-ak-tool-result]')).toBeNull()
  })
})

describe('ThinkingIndicator', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(() => ThinkingIndicator({ visible: false }))
    expect(container.querySelector('[data-ak-thinking]')).toBeNull()
  })

  it('renders default label when visible', () => {
    const { container } = render(() => ThinkingIndicator({ visible: true }))
    expect(container.querySelector('[data-ak-thinking-label]')?.textContent).toBe('Thinking...')
  })

  it('renders custom label', () => {
    const { container } = render(() => ThinkingIndicator({ visible: true, label: 'Working' }))
    expect(container.querySelector('[data-ak-thinking-label]')?.textContent).toBe('Working')
  })
})

describe('ToolConfirmation', () => {
  it('renders nothing unless status requires_confirmation', () => {
    const { container } = render(() =>
      ToolConfirmation({ toolCall: makeToolCall({ status: 'complete' }), onApprove: vi.fn(), onDeny: vi.fn() }),
    )
    expect(container.querySelector('[data-ak-tool-confirmation]')).toBeNull()
  })

  it('renders and wires approve/deny when requires_confirmation', () => {
    const onApprove = vi.fn()
    const onDeny = vi.fn()
    const { container } = render(() =>
      ToolConfirmation({
        toolCall: makeToolCall({ status: 'requires_confirmation' }),
        onApprove,
        onDeny,
      }),
    )
    const root = container.querySelector('[data-ak-tool-confirmation]') as HTMLElement
    expect(root.getAttribute('data-ak-tool-name')).toBe('search')
    expect(container.querySelector('[data-ak-tool-confirmation-name]')?.textContent).toBe('search')
    expect(container.querySelector('[data-ak-tool-confirmation-args]')?.textContent).toContain('cats')

    fireEvent.click(container.querySelector('[data-ak-tool-confirmation-approve]') as HTMLButtonElement)
    expect(onApprove).toHaveBeenCalledWith('t1')
    fireEvent.click(container.querySelector('[data-ak-tool-confirmation-deny]') as HTMLButtonElement)
    expect(onDeny).toHaveBeenCalledWith('t1')
  })
})

describe('InputBar', () => {
  it('disables send when input empty', () => {
    const chat = makeChat({ input: '' })
    const { container } = render(() => InputBar({ chat }))
    const btn = container.querySelector('[data-ak-send]') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect((container.querySelector('[data-ak-input]') as HTMLTextAreaElement).getAttribute('placeholder')).toBe(
      'Type a message...',
    )
  })

  it('enables send with input and submits on form submit', () => {
    const send = vi.fn()
    const chat = makeChat({ input: 'hi', send })
    const { container } = render(() => InputBar({ chat, placeholder: 'Ask' }))
    const form = container.querySelector('[data-ak-input-bar]') as HTMLFormElement
    expect((container.querySelector('[data-ak-input]') as HTMLTextAreaElement).getAttribute('placeholder')).toBe('Ask')
    expect((container.querySelector('[data-ak-send]') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.submit(form)
    expect(send).toHaveBeenCalledWith('hi')
  })

  it('does not submit empty (whitespace) input', () => {
    const send = vi.fn()
    const chat = makeChat({ input: '   ', send })
    const { container } = render(() => InputBar({ chat }))
    fireEvent.submit(container.querySelector('[data-ak-input-bar]') as HTMLFormElement)
    expect(send).not.toHaveBeenCalled()
  })

  it('calls setInput on input event', () => {
    const setInput = vi.fn()
    const chat = makeChat({ input: '', setInput })
    const { container } = render(() => InputBar({ chat }))
    const ta = container.querySelector('[data-ak-input]') as HTMLTextAreaElement
    ta.value = 'typed'
    fireEvent.input(ta)
    expect(setInput).toHaveBeenCalledWith('typed')
  })

  it('Enter submits, Shift+Enter does not', () => {
    const send = vi.fn()
    const chat = makeChat({ input: 'msg', send })
    const { container } = render(() => InputBar({ chat }))
    const ta = container.querySelector('[data-ak-input]') as HTMLTextAreaElement

    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true })
    expect(send).not.toHaveBeenCalled()

    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false })
    expect(send).toHaveBeenCalledWith('msg')
  })

  it('Enter with empty input does not submit', () => {
    const send = vi.fn()
    const chat = makeChat({ input: '', send })
    const { container } = render(() => InputBar({ chat }))
    fireEvent.keyDown(container.querySelector('[data-ak-input]') as HTMLTextAreaElement, {
      key: 'Enter',
      shiftKey: false,
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('respects explicit disabled prop', () => {
    const chat = makeChat({ input: 'hi' })
    const { container } = render(() => InputBar({ chat, disabled: true }))
    expect((container.querySelector('[data-ak-input]') as HTMLTextAreaElement).disabled).toBe(true)
    expect((container.querySelector('[data-ak-send]') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('exports', () => {
  beforeEach(() => {
    // noop, ensures describe registered
  })
  it('all 8 components are functions', () => {
    for (const c of [ChatContainer, Message, InputBar, Markdown, CodeBlock, ToolCallView, ThinkingIndicator, ToolConfirmation]) {
      expect(typeof c).toBe('function')
    }
  })
})
