import { type JSX } from 'solid-js'

/** Props accepted by the markdown content surface. */
export interface MarkdownProps {
  content: string
  streaming?: boolean
}

/** Render text content with an optional streaming data attribute.
 * @param props The content and optional streaming state.
 * @returns The headless markdown element.
 */
export function Markdown(props: MarkdownProps): JSX.Element {
  return (
    <div data-ak-markdown="" data-ak-streaming={props.streaming ? 'true' : undefined}>
      {props.content}
    </div>
  )
}
