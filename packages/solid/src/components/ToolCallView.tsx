import { createSignal, Show, type JSX } from 'solid-js'
import type { ToolCall } from '@agentskit/core'

/** Props accepted by the collapsible tool call display. */
export interface ToolCallViewProps {
  toolCall: ToolCall
}

/** Render a tool call with a toggle for its arguments and result.
 * @param props The tool call to display.
 * @returns The headless tool call element.
 */
export function ToolCallView(props: ToolCallViewProps): JSX.Element {
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div data-ak-tool-call="" data-ak-tool-status={props.toolCall.status}>
      <button
        onClick={() => setExpanded(!expanded())}
        data-ak-tool-toggle=""
        type="button"
        aria-expanded={expanded()}
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
