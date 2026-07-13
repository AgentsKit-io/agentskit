'use client'

import { useCallback, useState } from 'react'
import { CodeBlock } from '../../CodeBlock'
import type { UiToolProps } from '../define-ui-tool'
import { RunResult } from './RunResult'

/** `codeBlock` tool args — see `codeBlockTool` in `protocol.ts`. */
interface CodeBlockArgs {
  code: string
  lang?: string
  runnable?: boolean
}

function narrow(args: unknown): CodeBlockArgs | null {
  if (typeof args !== 'object' || args === null) return null
  const o = args as Record<string, unknown>
  if (typeof o.code !== 'string') return null
  return {
    code: o.code,
    lang: typeof o.lang === 'string' ? o.lang : undefined,
    runnable: o.runnable === true,
  }
}

/**
 * Wraps the shared `CodeBlock` (shiki highlight + copy). When the model marks
 * the block `runnable`, the Run button routes to `ctx.onRun(code)` — the host
 * wires that to the in-browser `webWorkerBackend` and appends a `RunResult`.
 */
export function CodeBlockTool({ args, ctx }: UiToolProps<unknown>) {
  const a = narrow(args)
  const [runningCode, setRunningCode] = useState<string>()
  const onRun = useCallback((code: string) => {
    setRunningCode(code)
    ctx.onRun?.(code)
  }, [ctx])
  if (!a) return null
  return (
    <div data-ak-tool="codeBlock">
      <CodeBlock code={a.code} lang={a.lang} runnable={a.runnable ?? false} onRun={onRun} />
      {runningCode === undefined ? null : <RunResult args={{ code: runningCode }} ctx={ctx} />}
    </div>
  )
}
