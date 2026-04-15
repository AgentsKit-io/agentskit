'use client'

import { useEffect, useId, useState } from 'react'

/**
 * Client-rendered Mermaid diagram. The `chart` string is authored in
 * MDX by maintainers — it is not user input. Mermaid's render() returns
 * sanitized SVG (securityLevel: 'strict').
 */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '-')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          themeVariables: {
            background: '#0D1117',
            primaryColor: '#161B22',
            primaryTextColor: '#E6EDF3',
            primaryBorderColor: '#30363D',
            lineColor: '#8B949E',
            secondaryColor: '#161B22',
            tertiaryColor: '#1F2937',
          },
        })
        const result = await mermaid.render(`mermaid-${id}`, chart)
        if (!cancelled) setSvg(result.svg)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chart, id])

  if (error) {
    return (
      <pre className="text-fd-muted-foreground text-xs">
        Mermaid render failed: {error}
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="text-fd-muted-foreground text-xs italic">
        Loading diagram...
      </div>
    )
  }

  /* eslint-disable-next-line react/no-danger -- mermaid output is trusted SVG */
  return <div dangerouslySetInnerHTML={{ __html: svg }} />
}
