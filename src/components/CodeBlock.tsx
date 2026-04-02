import React, { useCallback } from 'react'

export interface CodeBlockProps {
  code: string
  language?: string
  copyable?: boolean
}

export function CodeBlock({ code, language, copyable = false }: CodeBlockProps) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
  }, [code])

  return (
    <div data-ra-code-block="" data-ra-language={language}>
      <pre>
        <code>{code}</code>
      </pre>
      {copyable && (
        <button onClick={handleCopy} data-ra-copy="" type="button">
          Copy
        </button>
      )}
    </div>
  )
}
