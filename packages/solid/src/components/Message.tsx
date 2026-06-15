import { Show, type JSX } from 'solid-js'
import type { Message as MessageType } from '@agentskit/core'

export interface MessageProps {
  message: MessageType
  avatar?: JSX.Element
  actions?: JSX.Element
}

export function Message(props: MessageProps): JSX.Element {
  return (
    <div
      data-ak-message=""
      data-ak-role={props.message.role}
      data-ak-status={props.message.status}
    >
      <Show when={props.avatar}>
        <div data-ak-avatar="">{props.avatar}</div>
      </Show>
      <div data-ak-content="">{props.message.content}</div>
      <Show when={props.actions}>
        <div data-ak-actions="">{props.actions}</div>
      </Show>
    </div>
  )
}
