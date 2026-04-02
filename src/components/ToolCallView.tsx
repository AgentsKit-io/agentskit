import React, { useState } from 'react'
import type { ToolCall } from '../core/types'

export interface ToolCallViewProps {
  toolCall: ToolCall
}

export function ToolCallView({ toolCall }: ToolCallViewProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div data-ak-tool-call="" data-ak-tool-status={toolCall.status}>
      <button
        onClick={() => setExpanded(!expanded)}
        data-ak-tool-toggle=""
        type="button"
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
