import { Component, inject } from '@angular/core'
import { AgentskitChat, ChatContainerComponent, MessageComponent } from '@agentskit/angular'
import { anthropic } from '@agentskit/adapters'

@Component({
  standalone: true,
  imports: [ChatContainerComponent, MessageComponent],
  template: `
    <ak-chat-container>
      @for (m of chat.state()?.messages ?? []; track m.id) {
        <ak-message [message]="m" />
      }
    </ak-chat-container>
    <form (submit)="$event.preventDefault(); chat.send(chat.state()?.input ?? '')">
      <input [value]="chat.state()?.input ?? ''" (input)="chat.setInput($any($event.target).value)" />
    </form>
  `,
})
export class ChatWidget {
  protected readonly chat = inject(AgentskitChat)

  constructor() {
    this.chat.init({
      adapter: anthropic({ apiKey: process.env['NG_APP_ANTHROPIC_API_KEY']!, model: 'claude-sonnet-4-6' }),
    })
  }
}
