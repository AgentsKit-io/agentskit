import React, { useState } from 'react'
import type { ToolCall } from '../core/types'

export interface ToolCallViewProps {
  toolCall: ToolCall
}

export function ToolCallView({ toolCall }: ToolCallViewProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div data-ra-tool-call="" data-ra-tool-status={toolCall.status}>
      <button
        onClick={() => setExpanded(!expanded)}
        data-ra-tool-toggle=""
        type="button"
      >
        {toolCall.name}
      </button>
      {expanded && (
        <div data-ra-tool-details="">
          <pre data-ra-tool-args="">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
          {toolCall.result && (
            <div data-ra-tool-result="">{toolCall.result}</div>
          )}
        </div>
      )}
    </div>
  )
}
