import { Show, type JSX } from 'solid-js'

/** Props accepted by the conditional thinking status display. */
export interface ThinkingIndicatorProps {
  visible: boolean
  label?: string
}

/** Render a status indicator only while the chat is waiting.
 * @param props Visibility and optional label settings.
 * @returns The thinking indicator element or an empty value.
 */
export function ThinkingIndicator(props: ThinkingIndicatorProps): JSX.Element {
  const label = () => props.label ?? 'Thinking...'

  return (
    <Show when={props.visible}>
      <div data-ak-thinking="" data-testid="ak-thinking">
        <span data-ak-thinking-dots="">
          <span>&bull;</span>
          <span>&bull;</span>
          <span>&bull;</span>
        </span>
        <span data-ak-thinking-label="">{label()}</span>
      </div>
    </Show>
  )
}
