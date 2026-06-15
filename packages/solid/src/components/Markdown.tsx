import { type JSX } from 'solid-js'

export interface MarkdownProps {
  content: string
  streaming?: boolean
}

export function Markdown(props: MarkdownProps): JSX.Element {
  return (
    <div data-ak-markdown="" data-ak-streaming={props.streaming ? 'true' : undefined}>
      {props.content}
    </div>
  )
}
