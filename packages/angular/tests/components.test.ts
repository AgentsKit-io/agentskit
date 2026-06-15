import { describe, expect, it } from 'vitest'
import 'zone.js'
import { TestBed } from '@angular/core/testing'
import type { Message as MessageType, ChatReturn, ToolCall } from '@agentskit/core'
import {
  ChatContainerComponent,
  MessageComponent,
  InputBarComponent,
  MarkdownComponent,
  CodeBlockComponent,
  ToolCallViewComponent,
  ThinkingIndicatorComponent,
  ToolConfirmationComponent,
} from '../src'

const msg = (over: Partial<MessageType> = {}): MessageType =>
  ({ id: 'm1', role: 'assistant', status: 'complete', content: 'hello', ...over }) as MessageType

const toolCall = (over: Partial<ToolCall> = {}): ToolCall =>
  ({ id: 't1', name: 'search', args: { q: 'x' }, status: 'pending', result: '', ...over }) as ToolCall

describe('@agentskit/angular components', () => {
  it('ChatContainer renders wrapper + boots auto-scroll observer', () => {
    const f = TestBed.createComponent(ChatContainerComponent)
    f.detectChanges()
    const el = f.nativeElement.querySelector('[data-ak-chat-container]')
    expect(el).not.toBeNull()
    expect(el.getAttribute('data-testid')).toBe('ak-chat-container')
    f.destroy()
  })

  it('InputBar sends on Enter, not Shift+Enter', () => {
    const sent: string[] = []
    const chat = { input: 'hey', send: (t: string) => sent.push(t), setInput: () => {} } as unknown as ChatReturn
    const f = TestBed.createComponent(InputBarComponent)
    f.componentInstance.chat = chat
    f.detectChanges()
    const ta = f.nativeElement.querySelector('[data-ak-input]')
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
    expect(sent).toEqual([])
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(sent).toEqual(['hey'])
  })

  it('Message renders role, status, content', () => {
    const f = TestBed.createComponent(MessageComponent)
    f.componentInstance.message = msg()
    f.detectChanges()
    const el = f.nativeElement.querySelector('[data-ak-message]')
    expect(el.getAttribute('data-ak-role')).toBe('assistant')
    expect(el.getAttribute('data-ak-status')).toBe('complete')
    expect(f.nativeElement.querySelector('[data-ak-content]').textContent.trim()).toBe('hello')
  })

  it('InputBar submits + disables on empty', () => {
    const sent: string[] = []
    const chat = { input: 'hi', send: (t: string) => sent.push(t), setInput: () => {} } as unknown as ChatReturn
    const f = TestBed.createComponent(InputBarComponent)
    f.componentInstance.chat = chat
    f.detectChanges()
    f.nativeElement.querySelector('[data-ak-input-bar]').dispatchEvent(new Event('submit'))
    expect(sent).toEqual(['hi'])
    expect(f.nativeElement.querySelector('[data-ak-send]').disabled).toBe(false)
  })

  it('InputBar disables send when blank', () => {
    const chat = { input: '   ', send: () => {}, setInput: () => {} } as unknown as ChatReturn
    const f = TestBed.createComponent(InputBarComponent)
    f.componentInstance.chat = chat
    f.componentInstance.disabled = true
    f.detectChanges()
    expect(f.nativeElement.querySelector('[data-ak-send]').disabled).toBe(true)
  })

  it('Markdown reflects streaming flag', () => {
    const a = TestBed.createComponent(MarkdownComponent)
    a.componentInstance.content = 'c'
    a.componentInstance.streaming = true
    a.detectChanges()
    expect(a.nativeElement.querySelector('[data-ak-markdown]').getAttribute('data-ak-streaming')).toBe('true')
    const b = TestBed.createComponent(MarkdownComponent)
    b.componentInstance.content = 'c'
    b.detectChanges()
    expect(b.nativeElement.querySelector('[data-ak-markdown]').hasAttribute('data-ak-streaming')).toBe(false)
  })

  it('CodeBlock renders code + optional copy', () => {
    const a = TestBed.createComponent(CodeBlockComponent)
    a.componentInstance.code = 'x=1'
    a.componentInstance.language = 'ts'
    a.componentInstance.copyable = true
    a.detectChanges()
    expect(a.nativeElement.querySelector('[data-ak-code-block]').getAttribute('data-ak-language')).toBe('ts')
    expect(a.nativeElement.querySelector('[data-ak-copy]')).not.toBeNull()
    a.componentInstance.copy()
    const b = TestBed.createComponent(CodeBlockComponent)
    b.componentInstance.code = 'x'
    b.detectChanges()
    expect(b.nativeElement.querySelector('[data-ak-copy]')).toBeNull()
  })

  it('ToolCallView toggles details', () => {
    const f = TestBed.createComponent(ToolCallViewComponent)
    f.componentInstance.toolCall = toolCall({ result: 'ok' })
    f.detectChanges()
    expect(f.nativeElement.querySelector('[data-ak-tool-details]')).toBeNull()
    f.nativeElement.querySelector('[data-ak-tool-toggle]').click()
    f.detectChanges()
    expect(f.nativeElement.querySelector('[data-ak-tool-args]')).not.toBeNull()
    expect(f.nativeElement.querySelector('[data-ak-tool-result]').textContent.trim()).toBe('ok')
  })

  it('ThinkingIndicator shows only when visible', () => {
    const a = TestBed.createComponent(ThinkingIndicatorComponent)
    a.componentInstance.visible = true
    a.componentInstance.label = 'Working'
    a.detectChanges()
    expect(a.nativeElement.querySelector('[data-ak-thinking-label]').textContent.trim()).toBe('Working')
    const b = TestBed.createComponent(ThinkingIndicatorComponent)
    b.componentInstance.visible = false
    b.detectChanges()
    expect(b.nativeElement.querySelector('[data-ak-thinking]')).toBeNull()
  })

  it('ToolConfirmation renders only on requires_confirmation + wires actions', () => {
    const calls: string[] = []
    const f = TestBed.createComponent(ToolConfirmationComponent)
    f.componentInstance.toolCall = toolCall({ status: 'requires_confirmation' })
    f.componentInstance.onApprove = (id: string) => calls.push(`a:${id}`)
    f.componentInstance.onDeny = (id: string) => calls.push(`d:${id}`)
    f.detectChanges()
    expect(f.nativeElement.querySelector('[data-ak-tool-confirmation]').getAttribute('data-ak-tool-name')).toBe('search')
    f.nativeElement.querySelector('[data-ak-tool-confirmation-approve]').click()
    f.nativeElement.querySelector('[data-ak-tool-confirmation-deny]').click()
    expect(calls).toEqual(['a:t1', 'd:t1'])
  })

  it('ToolConfirmation renders nothing when not pending confirmation', () => {
    const f = TestBed.createComponent(ToolConfirmationComponent)
    f.componentInstance.toolCall = toolCall({ status: 'pending' })
    f.componentInstance.onApprove = () => {}
    f.componentInstance.onDeny = () => {}
    f.detectChanges()
    expect(f.nativeElement.querySelector('[data-ak-tool-confirmation]')).toBeNull()
  })
})
