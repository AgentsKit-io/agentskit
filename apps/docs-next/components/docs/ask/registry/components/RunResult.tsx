'use client'

import { useEffect, useRef, useState } from 'react'
import { runStreaming, type WebStreamChunk } from '@agentskit/sandbox/web'
import type { UiToolProps } from '../define-ui-tool'

/** `runExample` tool args — see `runExampleTool` in `protocol.ts`. */
interface RunResultArgs {
  code: string
}

function narrow(args: unknown): RunResultArgs | null {
  if (typeof args !== 'object' || args === null) return null
  const code = (args as Record<string, unknown>).code
  if (typeof code !== 'string') return null
  return { code }
}

interface Line {
  stream: 'stdout' | 'stderr'
  text: string
}

type Phase = 'running' | 'done' | 'failed'

/**
 * Executes a JS snippet in the browser sandbox (`runStreaming` over a
 * zero-vendor Web Worker) and shows stdout/stderr live as it arrives, then the
 * final exit code + duration. Self-driving: runs once on mount.
 */
export function RunResult({ args }: UiToolProps<unknown>) {
  const a = narrow(args)
  const code = a?.code ?? null
  const [lines, setLines] = useState<Line[]>([])
  const [phase, setPhase] = useState<Phase>('running')
  const [meta, setMeta] = useState<{ exitCode: number; durationMs: number } | null>(null)
  const ranFor = useRef<string | null>(null)

  useEffect(() => {
    if (code === null) return
    // Guard React 18 StrictMode double-invoke: run each distinct snippet once.
    if (ranFor.current === code) return
    ranFor.current = code

    let active = true
    setLines([])
    setMeta(null)
    setPhase('running')

    const onChunk = (chunk: WebStreamChunk) => {
      if (!active) return
      setLines((prev) => [...prev, { stream: chunk.stream, text: chunk.data }])
    }

    runStreaming(code, onChunk)
      .then((result) => {
        if (!active) return
        setMeta({ exitCode: result.exitCode, durationMs: result.durationMs })
        setPhase(result.exitCode === 0 ? 'done' : 'failed')
      })
      .catch((err: unknown) => {
        if (!active) return
        const message = err instanceof Error ? err.message : String(err)
        setLines((prev) => [...prev, { stream: 'stderr', text: message + '\n' }])
        setPhase('failed')
      })

    return () => {
      active = false
    }
  }, [code])

  if (!a) return null

  return (
    <div
      data-ak-tool="runExample"
      data-ak-phase={phase}
      className="my-1 overflow-hidden rounded-md border border-ak-border bg-ak-midnight"
    >
      <div className="flex items-center justify-between border-b border-ak-border bg-ak-surface px-2.5 py-1">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          <span
            aria-hidden
            className={
              phase === 'running'
                ? 'h-1.5 w-1.5 animate-pulse rounded-full bg-ak-blue'
                : phase === 'done'
                  ? 'h-1.5 w-1.5 rounded-full bg-ak-green'
                  : 'h-1.5 w-1.5 rounded-full bg-ak-red'
            }
          />
          {phase === 'running' ? 'Running' : phase === 'done' ? 'Output' : 'Failed'}
        </span>
        {meta ? (
          <span className="font-mono text-[10px] text-ak-graphite">
            exit {meta.exitCode} · {meta.durationMs}ms
          </span>
        ) : null}
      </div>
      <pre className="max-h-56 overflow-auto p-2.5 font-mono text-[11px] leading-relaxed">
        {lines.length === 0 && phase === 'running' ? (
          <span className="text-ak-graphite">…</span>
        ) : (
          lines.map((l, i) => (
            <span key={i} className={l.stream === 'stderr' ? 'text-ak-red' : 'text-ak-foam'}>
              {l.text}
            </span>
          ))
        )}
      </pre>
    </div>
  )
}
