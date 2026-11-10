import React, { useState } from 'react'
import type { ToolCall } from '@agentskit/core'

/** Props for displaying a tool call and its expandable details. */
export interface ToolCallViewProps {
  toolCall: ToolCall
}

/**
 * Render a tool call summary with a toggle for arguments and results.
 * @param props The tool call to display.
 * @returns The tool call element.
 */
export function ToolCallView({ toolCall }: ToolCallViewProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div data-ak-tool-call="" data-ak-tool-status={toolCall.status}>
      <button
        onClick={() => setExpanded(!expanded)}
        data-ak-tool-toggle=""
        type="button"
        aria-expanded={expanded}
      >
        {toolCall.name}
      </button>
      {expanded && (
        <div data-ak-tool-details="">
          <pre data-ak-tool-args="">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
          {toolCall.result && (
            <div data-ak-tool-result="">{toolCall.result}</div>
          )}
        </div>
      )}
    </div>
  )
}
