'use client'

import { Markdown } from '../../Markdown'
import type { UiToolProps } from '../define-ui-tool'

/** `answer` tool args — see `answerTool` in `protocol.ts`. */
interface AnswerArgs {
  markdown: string
}

function narrow(args: unknown): AnswerArgs | null {
  if (typeof args !== 'object' || args === null) return null
  const md = (args as Record<string, unknown>).markdown
  if (typeof md !== 'string') return null
  return { markdown: md }
}

/**
 * Renders a markdown answer via the shared `Markdown` renderer (streaming-safe;
 * tolerates partial documents). Unknown payload → nothing.
 */
export function Answer({ args }: UiToolProps<unknown>) {
  const a = narrow(args)
  if (!a) return null
  return (
    <div data-ak-tool="answer" className="ak-ask-answer">
      <Markdown content={a.markdown} />
    </div>
  )
}
