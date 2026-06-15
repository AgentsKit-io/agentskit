import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/svelte'
import type { Message as MessageType, ChatReturn, ToolCall } from '@agentskit/core'
import Message from '../src/components/Message.svelte'
import InputBar from '../src/components/InputBar.svelte'
import Markdown from '../src/components/Markdown.svelte'
import CodeBlock from '../src/components/CodeBlock.svelte'
import ToolCallView from '../src/components/ToolCallView.svelte'
import ThinkingIndicator from '../src/components/ThinkingIndicator.svelte'
import ToolConfirmation from '../src/components/ToolConfirmation.svelte'

const msg = (over: Partial<MessageType> = {}): MessageType =>
  ({ id: 'm1', role: 'assistant', status: 'complete', content: 'hello', ...over }) as MessageType

const toolCall = (over: Partial<ToolCall> = {}): ToolCall =>
  ({ id: 't1', name: 'search', args: { q: 'x' }, status: 'pending', result: '', ...over }) as ToolCall

describe('@agentskit/svelte components', () => {
  it('Message renders role, status, content', () => {
    const { container } = render(Message, { props: { message: msg() } })
    const el = container.querySelector('[data-ak-message]')
    expect(el?.getAttribute('data-ak-role')).toBe('assistant')
    expect(el?.getAttribute('data-ak-status')).toBe('complete')
    expect(container.querySelector('[data-ak-content]')?.textContent).toBe('hello')
  })

  it('InputBar submits input, disables on empty', async () => {
    const sent: string[] = []
    const chat = { input: 'hi', send: (t: string) => sent.push(t), setInput: () => {} } as unknown as ChatReturn
    const { container } = render(InputBar, { props: { chat } })
    ;(container.querySelector('[data-ak-input-bar]') as HTMLFormElement).requestSubmit?.()
    container.querySelector('[data-ak-input-bar]')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(sent).toContain('hi')
    expect((container.querySelector('[data-ak-send]') as HTMLButtonElement).disabled).toBe(false)
  })

  it('InputBar disables send when input is blank', () => {
    const chat = { input: '   ', send: () => {}, setInput: () => {} } as unknown as ChatReturn
    const { container } = render(InputBar, { props: { chat, disabled: true } })
    expect((container.querySelector('[data-ak-send]') as HTMLButtonElement).disabled).toBe(true)
  })

  it('Markdown reflects streaming flag', () => {
    const a = render(Markdown, { props: { content: 'c', streaming: true } })
    expect(a.container.querySelector('[data-ak-markdown]')?.getAttribute('data-ak-streaming')).toBe('true')
    const b = render(Markdown, { props: { content: 'c' } })
    expect(b.container.querySelector('[data-ak-markdown]')?.hasAttribute('data-ak-streaming')).toBe(false)
  })

  it('CodeBlock renders code + optional copy', () => {
    const a = render(CodeBlock, { props: { code: 'x=1', language: 'ts', copyable: true } })
    expect(a.container.querySelector('[data-ak-code-block]')?.getAttribute('data-ak-language')).toBe('ts')
    expect(a.container.querySelector('[data-ak-copy]')).not.toBeNull()
    const b = render(CodeBlock, { props: { code: 'x' } })
    expect(b.container.querySelector('[data-ak-copy]')).toBeNull()
  })

  it('ToolCallView toggles details', async () => {
    const { container } = render(ToolCallView, { props: { toolCall: toolCall({ result: 'ok' }) } })
    expect(container.querySelector('[data-ak-tool-details]')).toBeNull()
    ;(container.querySelector('[data-ak-tool-toggle]') as HTMLButtonElement).click()
    await Promise.resolve()
    expect(container.querySelector('[data-ak-tool-args]')).not.toBeNull()
  })

  it('ThinkingIndicator shows only when visible', () => {
    const a = render(ThinkingIndicator, { props: { visible: true, label: 'Working' } })
    expect(a.container.querySelector('[data-ak-thinking-label]')?.textContent).toBe('Working')
    const b = render(ThinkingIndicator, { props: { visible: false } })
    expect(b.container.querySelector('[data-ak-thinking]')).toBeNull()
  })

  it('ToolConfirmation renders only on requires_confirmation + wires actions', () => {
    const calls: string[] = []
    const { container } = render(ToolConfirmation, {
      props: {
        toolCall: toolCall({ status: 'requires_confirmation' }),
        onApprove: (id: string) => calls.push(`a:${id}`),
        onDeny: (id: string) => calls.push(`d:${id}`),
      },
    })
    expect(container.querySelector('[data-ak-tool-confirmation]')?.getAttribute('data-ak-tool-name')).toBe('search')
    ;(container.querySelector('[data-ak-tool-confirmation-approve]') as HTMLButtonElement).click()
    ;(container.querySelector('[data-ak-tool-confirmation-deny]') as HTMLButtonElement).click()
    expect(calls).toEqual(['a:t1', 'd:t1'])
  })

  it('ToolConfirmation renders nothing when not pending confirmation', () => {
    const { container } = render(ToolConfirmation, {
      props: { toolCall: toolCall({ status: 'pending' }), onApprove: () => {}, onDeny: () => {} },
    })
    expect(container.querySelector('[data-ak-tool-confirmation]')).toBeNull()
  })
})
