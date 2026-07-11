import { describe, expect, it } from 'vitest'
import { createApp, h, nextTick, type Component } from 'vue'
import type { Message as MessageType, ChatReturn, ToolCall } from '@agentskit/core'
import {
  Message,
  ChatRoot,
  InputBar,
  Markdown,
  CodeBlock,
  ToolCallView,
  ThinkingIndicator,
  ToolConfirmation,
} from '../src'

function mount(render: () => unknown): { root: HTMLElement; unmount: () => void } {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({ render })
  app.mount(root)
  return { root, unmount: () => app.unmount() }
}

const msg = (over: Partial<MessageType> = {}): MessageType =>
  ({ id: 'm1', role: 'assistant', status: 'complete', content: 'hello', ...over }) as MessageType

const toolCall = (over: Partial<ToolCall> = {}): ToolCall =>
  ({ id: 't1', name: 'search', args: { q: 'x' }, status: 'pending', result: '', ...over }) as ToolCall

describe('@agentskit/vue components', () => {
  it('ChatRoot renders its default slot without creating chat state', async () => {
    const { root, unmount } = mount(() => h(ChatRoot, {}, { default: () => h('p', 'application chat') }))
    await nextTick()
    expect(root.querySelector('[data-ak-chat]')?.textContent).toBe('application chat')
    unmount()
  })

  it('Message renders role, status, content + slots', async () => {
    const { root, unmount } = mount(() =>
      h(Message, { message: msg() }, { avatar: () => 'A', actions: () => 'X' }),
    )
    await nextTick()
    const el = root.querySelector('[data-ak-message]')!
    expect(el.getAttribute('data-ak-role')).toBe('assistant')
    expect(el.getAttribute('data-ak-status')).toBe('complete')
    expect(root.querySelector('[data-ak-content]')?.textContent).toBe('hello')
    expect(root.querySelector('[data-ak-avatar]')).not.toBeNull()
    expect(root.querySelector('[data-ak-actions]')).not.toBeNull()
    unmount()
  })

  it('Message omits avatar/actions when no slots', async () => {
    const { root, unmount } = mount(() => h(Message, { message: msg() }))
    await nextTick()
    expect(root.querySelector('[data-ak-avatar]')).toBeNull()
    expect(root.querySelector('[data-ak-actions]')).toBeNull()
    unmount()
  })

  it('InputBar submits input and respects disabled', async () => {
    const sent: string[] = []
    const chat = { input: 'hi', status: 'idle', send: (t: string) => sent.push(t), setInput: () => {} } as unknown as ChatReturn
    const { root, unmount } = mount(() => h(InputBar, { chat }))
    await nextTick()
    const form = root.querySelector('[data-ak-input-bar]') as HTMLFormElement
    form.dispatchEvent(new Event('submit'))
    expect(sent).toEqual(['hi'])
    const btn = root.querySelector('[data-ak-send]') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    unmount()
  })

  it('InputBar sends on Enter but not Shift+Enter', async () => {
    const sent: string[] = []
    const chat = { input: 'hey', status: 'idle', send: (t: string) => sent.push(t), setInput: () => {} } as unknown as ChatReturn
    const { root, unmount } = mount(() => h(InputBar, { chat }))
    await nextTick()
    const ta = root.querySelector('[data-ak-input]') as HTMLTextAreaElement
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
    expect(sent).toEqual([])
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(sent).toEqual(['hey'])
    unmount()
  })

  it('InputBar updates input on typing', async () => {
    const typed: string[] = []
    const chat = { input: '', status: 'idle', send: () => {}, setInput: (v: string) => typed.push(v) } as unknown as ChatReturn
    const { root, unmount } = mount(() => h(InputBar, { chat }))
    await nextTick()
    const ta = root.querySelector('[data-ak-input]') as HTMLTextAreaElement
    ta.value = 'draft'
    ta.dispatchEvent(new Event('input'))
    expect(typed).toEqual(['draft'])
    unmount()
  })

  it('InputBar disables send on empty input', async () => {
    const chat = { input: '   ', status: 'idle', send: () => {}, setInput: () => {} } as unknown as ChatReturn
    const { root, unmount } = mount(() => h(InputBar, { chat, disabled: true }))
    await nextTick()
    expect((root.querySelector('[data-ak-send]') as HTMLButtonElement).disabled).toBe(true)
    unmount()
  })

  it('Markdown reflects streaming flag', async () => {
    const a = mount(() => h(Markdown, { content: 'c', streaming: true }))
    await nextTick()
    expect(a.root.querySelector('[data-ak-markdown]')?.getAttribute('data-ak-streaming')).toBe('true')
    a.unmount()
    const b = mount(() => h(Markdown, { content: 'c' }))
    await nextTick()
    expect(b.root.querySelector('[data-ak-markdown]')?.hasAttribute('data-ak-streaming')).toBe(false)
    b.unmount()
  })

  it('CodeBlock renders code + optional copy button', async () => {
    const a = mount(() => h(CodeBlock, { code: 'x=1', language: 'ts', copyable: true }))
    await nextTick()
    expect(a.root.querySelector('[data-ak-code-block]')?.getAttribute('data-ak-language')).toBe('ts')
    expect(a.root.querySelector('[data-ak-copy]')).not.toBeNull()
    ;(a.root.querySelector('[data-ak-copy]') as HTMLButtonElement).click()
    a.unmount()
    const b = mount(() => h(CodeBlock, { code: 'x' }))
    await nextTick()
    expect(b.root.querySelector('[data-ak-copy]')).toBeNull()
    b.unmount()
  })

  it('ToolCallView toggles details', async () => {
    const { root, unmount } = mount(() => h(ToolCallView, { toolCall: toolCall({ result: 'ok' }) }))
    await nextTick()
    expect(root.querySelector('[data-ak-tool-details]')).toBeNull()
    ;(root.querySelector('[data-ak-tool-toggle]') as HTMLButtonElement).click()
    await nextTick()
    expect(root.querySelector('[data-ak-tool-args]')).not.toBeNull()
    expect(root.querySelector('[data-ak-tool-result]')?.textContent).toBe('ok')
    unmount()
  })

  it('ThinkingIndicator shows only when visible', async () => {
    const a = mount(() => h(ThinkingIndicator, { visible: true, label: 'Working' }))
    await nextTick()
    expect(a.root.querySelector('[data-ak-thinking-label]')?.textContent).toBe('Working')
    a.unmount()
    const b = mount(() => h(ThinkingIndicator, { visible: false }))
    await nextTick()
    expect(b.root.querySelector('[data-ak-thinking]')).toBeNull()
    b.unmount()
  })

  it('ToolConfirmation renders only on requires_confirmation + wires actions', async () => {
    const calls: string[] = []
    const tc = toolCall({ status: 'requires_confirmation' })
    const { root, unmount } = mount(() =>
      h(ToolConfirmation, {
        toolCall: tc,
        onApprove: (id: string) => calls.push(`a:${id}`),
        onDeny: (id: string) => calls.push(`d:${id}`),
      }),
    )
    await nextTick()
    expect(root.querySelector('[data-ak-tool-confirmation]')?.getAttribute('data-ak-tool-name')).toBe('search')
    ;(root.querySelector('[data-ak-tool-confirmation-approve]') as HTMLButtonElement).click()
    ;(root.querySelector('[data-ak-tool-confirmation-deny]') as HTMLButtonElement).click()
    expect(calls).toEqual(['a:t1', 'd:t1'])
    unmount()
  })

  it('ToolConfirmation renders nothing when not pending confirmation', async () => {
    const { root, unmount } = mount(() =>
      h(ToolConfirmation, { toolCall: toolCall({ status: 'pending' }), onApprove: () => {}, onDeny: () => {} }) as Component,
    )
    await nextTick()
    expect(root.querySelector('[data-ak-tool-confirmation]')).toBeNull()
    unmount()
  })
})
