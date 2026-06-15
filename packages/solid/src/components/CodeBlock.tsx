import { Show, type JSX } from 'solid-js'

export interface CodeBlockProps {
  code: string
  language?: string
  copyable?: boolean
}

export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const handleCopy = () => {
    navigator.clipboard.writeText(props.code)
  }

  return (
    <div data-ak-code-block="" data-ak-language={props.language}>
      <pre>
        <code>{props.code}</code>
      </pre>
      <Show when={props.copyable}>
        <button onClick={handleCopy} data-ak-copy="" type="button">
          Copy
        </button>
      </Show>
    </div>
  )
}
