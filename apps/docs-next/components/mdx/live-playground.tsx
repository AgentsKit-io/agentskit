'use client'

import { useEffect, useRef, useState } from 'react'

export type LivePlaygroundProps = {
  /** Initial JS / TS source. Runs on every change inside a worker sandbox. */
  code: string
  /** Optional title for the editor pane. */
  title?: string
  /** Editor height in px. Defaults to 240. */
  height?: number
  /** Output area height in px. Defaults to 160. */
  outputHeight?: number
  /** Disable auto-run; user clicks "Run". */
  manual?: boolean
}

/**
 * `<LivePlayground />` — JS/TS editor + worker-sandbox runner.
 *
 * Each `code` change spawns a fresh Web Worker that evaluates the snippet
 * in isolation (no DOM, no top-level `await`, 3-second hard timeout).
 * Console output streams back via `postMessage`. The worker is terminated
 * on every re-run, on unmount, and on the timeout.
 *
 * Why a Worker, not an iframe:
 *   - Same-origin sandbox boundary, no DOM exposure.
 *   - Faster spin-up than an `<iframe>` for repeated edits.
 *   - Can be terminated mid-execution (`worker.terminate()`).
 */
export function LivePlayground({
  code: initial,
  title,
  height = 240,
  outputHeight = 160,
  manual = false,
}: LivePlaygroundProps) {
  const [code, setCode] = useState(initial)
  const [output, setOutput] = useState<Array<{ kind: 'log' | 'error'; text: string }>>([])
  const [running, setRunning] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  const run = (source: string) => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setRunning(true)
    setOutput([])

    // Worker body — overrides console.log / error to postMessage back
    // and runs the user snippet inside a Function constructor (sandboxed
    // by the worker scope). No DOM, no parent-window access.
    const workerSource = [
      `const send = (kind, args) => self.postMessage({ kind, text: args.map(formatArg).join(' ') })`,
      `function formatArg(a) { try { return typeof a === 'string' ? a : JSON.stringify(a) } catch { return String(a) } }`,
      `console.log = (...args) => send('log', args)`,
      `console.error = (...args) => send('error', args)`,
      `self.onmessage = async (event) => {`,
      `  try {`,
      `    const fn = new Function(event.data)`,
      `    const result = fn()`,
      `    if (result instanceof Promise) await result`,
      `    self.postMessage({ kind: 'done' })`,
      `  } catch (err) {`,
      `    self.postMessage({ kind: 'error', text: err && err.stack ? err.stack : String(err) })`,
      `    self.postMessage({ kind: 'done' })`,
      `  }`,
      `}`,
    ].join('\n')
    const blobUrl = URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }))
    const worker = new Worker(blobUrl)
    workerRef.current = worker
    URL.revokeObjectURL(blobUrl)

    const timeout = setTimeout(() => {
      worker.terminate()
      setOutput(prev => [...prev, { kind: 'error', text: '✗ run aborted — exceeded 3s timeout' }])
      setRunning(false)
    }, 3000)

    worker.onmessage = (event: MessageEvent<{ kind: 'log' | 'error' | 'done'; text?: string }>) => {
      if (event.data.kind === 'done') {
        clearTimeout(timeout)
        setRunning(false)
        worker.terminate()
        return
      }
      const { kind, text } = event.data
      if (typeof text === 'string') {
        setOutput(prev => [...prev, { kind, text }])
      }
    }

    worker.onerror = (event) => {
      clearTimeout(timeout)
      setOutput(prev => [...prev, { kind: 'error', text: event.message }])
      setRunning(false)
      worker.terminate()
    }

    worker.postMessage(source)
  }

  useEffect(() => {
    if (!manual) run(code)
    return () => { workerRef.current?.terminate() }
    // intentionally rerun whenever the code text changes (or on mount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, manual])

  return (
    <div data-ak-playground className="my-6 overflow-hidden rounded-lg border border-ak-border bg-ak-surface">
      <div className="flex items-center justify-between border-b border-ak-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-ak-midnight px-1.5 py-0.5 font-mono uppercase tracking-[0.15em] text-ak-graphite">
            playground
          </span>
          {title && <span className="text-ak-foam">{title}</span>}
        </div>
        <button
          type="button"
          onClick={() => run(code)}
          disabled={running}
          className="rounded bg-ak-foam px-2.5 py-1 text-xs font-semibold text-ak-midnight disabled:opacity-50"
        >
          {running ? 'running…' : 'run'}
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        style={{ width: '100%', height, padding: 12, fontFamily: 'ui-monospace, monospace', fontSize: 12, background: 'transparent', color: 'inherit', border: 0, resize: 'vertical' }}
      />
      <div
        data-ak-playground-output
        style={{ height: outputHeight, overflowY: 'auto', padding: 12, borderTop: '1px solid var(--color-ak-border, #2a2a2a)', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
      >
        {output.length === 0 && !running && (
          <div className="text-ak-graphite">No output yet.</div>
        )}
        {output.map((line, i) => (
          <div key={i} style={{ color: line.kind === 'error' ? '#ff6b6b' : 'inherit', whiteSpace: 'pre-wrap' }}>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}
