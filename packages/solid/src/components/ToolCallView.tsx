import { createSignal, Show, type JSX } from 'solid-js'
import type { ToolCall } from '@agentskit/core'

export interface ToolCallViewProps {
  toolCall: ToolCall
}

export function ToolCallView(props: ToolCallViewProps): JSX.Element {
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div data-ak-tool-call="" data-ak-tool-status={props.toolCall.status}>
      <button
        onClick={() => setExpanded(!expanded())}
        data-ak-tool-toggle=""
        type="button"
      >
        {props.toolCall.name}
      </button>
      <Show when={expanded()}>
        <div data-ak-tool-details="">
          <pre data-ak-tool-args="">
            {JSON.stringify(props.toolCall.args, null, 2)}
          </pre>
          <Show when={props.toolCall.result}>
            <div data-ak-tool-result="">{props.toolCall.result}</div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
