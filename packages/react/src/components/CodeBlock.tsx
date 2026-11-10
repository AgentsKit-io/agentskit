import React, { useCallback } from 'react'

/** Props for displaying code with an optional clipboard control. */
export interface CodeBlockProps {
  code: string
  language?: string
  copyable?: boolean
}

/**
 * Render code and optionally show a button that copies it to the clipboard.
 * @param props The code, optional language, and copy control flag.
 * @returns The code block element.
 */
export function CodeBlock({ code, language, copyable = false }: CodeBlockProps) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
  }, [code])

  return (
    <div data-ak-code-block="" data-ak-language={language}>
      <pre>
        <code>{code}</code>
      </pre>
      {copyable && (
        <button onClick={handleCopy} data-ak-copy="" type="button">
          Copy
        </button>
      )}
    </div>
  )
}
