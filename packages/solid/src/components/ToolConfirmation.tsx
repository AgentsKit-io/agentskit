import { Show, type JSX } from 'solid-js'
import type { ToolCall } from '@agentskit/core'

export interface ToolConfirmationProps {
  toolCall: ToolCall
  onApprove: (toolCallId: string) => void
  onDeny: (toolCallId: string, reason?: string) => void
}

export function ToolConfirmation(props: ToolConfirmationProps): JSX.Element {
  return (
    <Show when={props.toolCall.status === 'requires_confirmation'}>
      <div data-ak-tool-confirmation="" data-ak-tool-name={props.toolCall.name}>
        <div data-ak-tool-confirmation-header="">
          <span data-ak-tool-confirmation-name="">{props.toolCall.name}</span>
          <span data-ak-tool-confirmation-status="">requires confirmation</span>
        </div>
        <div data-ak-tool-confirmation-args="">
          {JSON.stringify(props.toolCall.args, null, 2)}
        </div>
        <div data-ak-tool-confirmation-actions="">
          <button
            data-ak-tool-confirmation-approve=""
            type="button"
            onClick={() => props.onApprove(props.toolCall.id)}
          >
            Approve
          </button>
          <button
            data-ak-tool-confirmation-deny=""
            type="button"
            onClick={() => props.onDeny(props.toolCall.id)}
          >
            Deny
          </button>
        </div>
      </div>
    </Show>
  )
}
