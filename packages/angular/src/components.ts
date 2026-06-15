import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  signal,
  type AfterViewInit,
  type OnDestroy,
} from '@angular/core'
import type { Message as MessageType, ChatReturn, ToolCall } from '@agentskit/core'

/**
 * Headless Angular chat components mirroring `@agentskit/react`'s set. Each
 * renders `data-ak-*` attributes only — bring your own CSS. Standalone +
 * JIT-friendly (inline templates); pairs with the `AgentskitChat` service.
 */

@Component({
  selector: 'ak-chat-container',
  standalone: true,
  template: `<div #scroll data-ak-chat-container data-testid="ak-chat-container"><ng-content /></div>`,
})
export class ChatContainerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scroll', { static: true }) scrollRef!: ElementRef<HTMLDivElement>
  private observer?: MutationObserver

  ngAfterViewInit(): void {
    const el = this.scrollRef?.nativeElement
    if (!el || typeof MutationObserver === 'undefined') return
    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight
    })
    // Some non-browser envs (e.g. happy-dom) expose a partial MutationObserver.
    if (typeof observer.observe !== 'function') return
    this.observer = observer
    observer.observe(el, { childList: true, subtree: true, characterData: true })
  }

  ngOnDestroy(): void {
    if (typeof this.observer?.disconnect === 'function') this.observer.disconnect()
  }
}

@Component({
  selector: 'ak-message',
  standalone: true,
  template: `<div
    data-ak-message
    [attr.data-ak-role]="message.role"
    [attr.data-ak-status]="message.status"
  >
    <div data-ak-content>{{ message.content }}</div>
  </div>`,
})
export class MessageComponent {
  @Input({ required: true }) message!: MessageType
}

@Component({
  selector: 'ak-input-bar',
  standalone: true,
  template: `<form data-ak-input-bar (submit)="onSubmit($event)">
    <textarea
      role="textbox"
      data-ak-input
      rows="1"
      [value]="chat.input"
      [attr.placeholder]="placeholder"
      [disabled]="disabled"
      (input)="chat.setInput($any($event.target).value)"
      (keydown.enter)="onEnter($event)"
    ></textarea>
    <button data-ak-send type="submit" [disabled]="disabled || !chat.input.trim()">Send</button>
  </form>`,
})
export class InputBarComponent {
  @Input({ required: true }) chat!: ChatReturn
  @Input() placeholder = 'Type a message...'
  @Input() disabled = false

  onSubmit(e: Event): void {
    e.preventDefault()
    this.submit()
  }

  onEnter(e: Event): void {
    if (!(e as KeyboardEvent).shiftKey) {
      e.preventDefault()
      this.submit()
    }
  }

  private submit(): void {
    if (this.chat.input.trim()) this.chat.send(this.chat.input)
  }
}

@Component({
  selector: 'ak-markdown',
  standalone: true,
  template: `<div data-ak-markdown [attr.data-ak-streaming]="streaming ? 'true' : null">{{ content }}</div>`,
})
export class MarkdownComponent {
  @Input({ required: true }) content = ''
  @Input() streaming = false
}

@Component({
  selector: 'ak-code-block',
  standalone: true,
  template: `<div data-ak-code-block [attr.data-ak-language]="language">
    <pre><code>{{ code }}</code></pre>
    @if (copyable) {
      <button data-ak-copy type="button" (click)="copy()">Copy</button>
    }
  </div>`,
})
export class CodeBlockComponent {
  @Input({ required: true }) code = ''
  @Input() language?: string
  @Input() copyable = false

  copy(): void {
    void globalThis.navigator?.clipboard?.writeText(this.code)
  }
}

@Component({
  selector: 'ak-tool-call-view',
  standalone: true,
  template: `<div data-ak-tool-call [attr.data-ak-tool-status]="toolCall.status">
    <button data-ak-tool-toggle type="button" (click)="expanded.set(!expanded())">
      {{ toolCall.name }}
    </button>
    @if (expanded()) {
      <div data-ak-tool-details>
        <pre data-ak-tool-args>{{ argsJson }}</pre>
        @if (toolCall.result) {
          <div data-ak-tool-result>{{ toolCall.result }}</div>
        }
      </div>
    }
  </div>`,
})
export class ToolCallViewComponent {
  @Input({ required: true }) toolCall!: ToolCall
  readonly expanded = signal(false)

  get argsJson(): string {
    return JSON.stringify(this.toolCall.args, null, 2)
  }
}

@Component({
  selector: 'ak-thinking-indicator',
  standalone: true,
  template: `@if (visible) {
    <div data-ak-thinking>
      <span data-ak-thinking-dots><span>•</span><span>•</span><span>•</span></span>
      <span data-ak-thinking-label>{{ label }}</span>
    </div>
  }`,
})
export class ThinkingIndicatorComponent {
  @Input({ required: true }) visible = false
  @Input() label = 'Thinking...'
}

@Component({
  selector: 'ak-tool-confirmation',
  standalone: true,
  template: `@if (toolCall.status === 'requires_confirmation') {
    <div data-ak-tool-confirmation [attr.data-ak-tool-name]="toolCall.name">
      <div data-ak-tool-confirmation-header>
        <span data-ak-tool-confirmation-name>{{ toolCall.name }}</span>
        <span data-ak-tool-confirmation-status>requires confirmation</span>
      </div>
      <div data-ak-tool-confirmation-args>{{ argsJson }}</div>
      <div data-ak-tool-confirmation-actions>
        <button data-ak-tool-confirmation-approve type="button" (click)="onApprove(toolCall.id)">
          Approve
        </button>
        <button data-ak-tool-confirmation-deny type="button" (click)="onDeny(toolCall.id)">
          Deny
        </button>
      </div>
    </div>
  }`,
})
export class ToolConfirmationComponent {
  @Input({ required: true }) toolCall!: ToolCall
  @Input({ required: true }) onApprove!: (toolCallId: string) => void
  @Input({ required: true }) onDeny!: (toolCallId: string, reason?: string) => void

  get argsJson(): string {
    return JSON.stringify(this.toolCall.args, null, 2)
  }
}
