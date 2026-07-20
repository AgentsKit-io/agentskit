import { Injectable, OnDestroy, signal, type WritableSignal } from '@angular/core'
import { BehaviorSubject, type Observable } from 'rxjs'
import { createChatController } from '@agentskit/core'
import type {
  ChatConfig,
  ChatController,
  ChatReturn,
  ChatState,
  EditOptions,
  ToolCall,
} from '@agentskit/core'

/**
 * Angular service wrapping the shared `ChatController`. Exposes
 * chat state both as a Signal (template-friendly) and as a
 * BehaviorSubject (RxJS interop).
 *
 * Usage:
 *   @Component({ ... })
 *   export class ChatPage {
 *     constructor(public chat: AgentskitChat) {
 *       chat.init({ adapter })
 *     }
 *   }
 */
@Injectable({ providedIn: 'root' })
export class AgentskitChat implements OnDestroy {
  private controller?: ChatController
  private unsubscribe?: () => void

  readonly state: WritableSignal<ChatState | null> = signal(null)
  private readonly _stream$ = new BehaviorSubject<ChatState | null>(null)
  readonly stream$: Observable<ChatState | null> = this._stream$.asObservable()

  init(config: ChatConfig): ChatReturn {
    if (this.controller) this.destroy()
    this.controller = createChatController(config)
    const push = (): void => {
      const current = this.controller?.getState() ?? null
      this.state.set(current)
      this._stream$.next(current)
    }
    push()
    this.unsubscribe = this.controller.subscribe(push)
    return this.snapshot()
  }

  snapshot(): ChatReturn {
    const c = this.requireController()
    return {
      ...c.getState(),
      send: c.send,
      stop: c.stop,
      retry: c.retry,
      edit: c.edit,
      regenerate: c.regenerate,
      setInput: c.setInput,
      clear: c.clear,
      proposeToolCall: c.proposeToolCall,
      approve: c.approve,
      deny: c.deny,
    }
  }

  send = (text: string): Promise<void> => this.requireController().send(text)

  stop = (): void => this.requireController().stop()

  retry = (): Promise<void> => this.requireController().retry()

  edit = (messageId: string, newContent: string, opts?: EditOptions): Promise<void> =>
    this.requireController().edit(messageId, newContent, opts)

  regenerate = (messageId?: string): Promise<void> => this.requireController().regenerate(messageId)

  setInput = (value: string): void => this.requireController().setInput(value)

  clear = (): Promise<void> => this.requireController().clear()

  proposeToolCall = (proposal: Parameters<ChatReturn['proposeToolCall']>[0]): Promise<ToolCall> =>
    this.requireController().proposeToolCall(proposal)

  approve = (id: string): Promise<void> => this.requireController().approve(id)

  deny = (id: string, reason?: string): Promise<void> => this.requireController().deny(id, reason)

  destroy(): void {
    this.unsubscribe?.()
    this.controller?.stop()
    this.unsubscribe = undefined
    this.controller = undefined
    this.state.set(null)
    this._stream$.next(null)
  }

  ngOnDestroy(): void {
    this.destroy()
  }

  private requireController(): ChatController {
    if (!this.controller) throw new Error('AgentskitChat.init(...) must be called first')
    return this.controller
  }
}
