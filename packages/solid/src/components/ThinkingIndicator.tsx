import { Show, type JSX } from 'solid-js'

export interface ThinkingIndicatorProps {
  visible: boolean
  label?: string
}

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
