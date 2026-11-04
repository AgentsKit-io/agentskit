import React from 'react'
import type { ToolCall } from '@agentskit/core'

/** Text overrides for the tool confirmation controls. */
export interface ToolConfirmationLabels {
  approve?: string
  deny?: string
  status?: string
  undo?: string
}

/** Props for approving or denying a tool call that requires confirmation. */
export interface ToolConfirmationProps {
  toolCall: ToolCall
  onApprove: (toolCallId: string) => void
  onDeny: (toolCallId: string, reason?: string) => void
  /** Overrides for the default English texts. */
  labels?: ToolConfirmationLabels
  /** When set, an undo button is rendered once the call was approved. */
  onUndo?: (toolCallId: string) => void
}

/**
 * Render approval controls only while the tool call needs confirmation.
 * @param props The tool call and its approval and denial callbacks.
 * @returns The confirmation element or `null`.
 */
export function ToolConfirmation({ toolCall, onApprove, onDeny, labels, onUndo }: ToolConfirmationProps) {
  if (onUndo && (toolCall.status === 'running' || toolCall.status === 'complete')) {
    return (
      <div data-ak-tool-confirmation data-ak-tool-name={toolCall.name}>
        <button data-ak-tool-confirmation-undo onClick={() => onUndo(toolCall.id)}>
          {labels?.undo ?? 'Undo'}
        </button>
      </div>
    )
  }
  if (toolCall.status !== 'requires_confirmation') return null

  return (
    <div data-ak-tool-confirmation data-ak-tool-name={toolCall.name}>
      <div data-ak-tool-confirmation-header>
        <span data-ak-tool-confirmation-name>{toolCall.name}</span>
        <span data-ak-tool-confirmation-status>{labels?.status ?? 'requires confirmation'}</span>
      </div>
      <div data-ak-tool-confirmation-args>
        {JSON.stringify(toolCall.args, null, 2)}
      </div>
      <div data-ak-tool-confirmation-actions>
        <button
          data-ak-tool-confirmation-approve
          onClick={() => onApprove(toolCall.id)}
        >
          {labels?.approve ?? 'Approve'}
        </button>
        <button
          data-ak-tool-confirmation-deny
          onClick={() => onDeny(toolCall.id)}
        >
          {labels?.deny ?? 'Deny'}
        </button>
      </div>
    </div>
  )
}
