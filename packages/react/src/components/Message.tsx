import React, { type ReactNode } from 'react'
import type { Message as MessageType } from '@agentskit/core'

/** Props for a message with optional avatar and action content. */
export interface MessageProps {
  message: MessageType
  avatar?: ReactNode
  actions?: ReactNode
}

/**
 * Render a chat message with role, status, and optional content slots.
 * @param props The message and optional avatar and action elements.
 * @returns The message element.
 */
export function Message({ message, avatar, actions }: MessageProps) {
  return (
    <div
      data-ak-message=""
      data-ak-role={message.role}
      data-ak-status={message.status}
    >
      {avatar && <div data-ak-avatar="">{avatar}</div>}
      <div data-ak-content="">{message.content}</div>
      {actions && <div data-ak-actions="">{actions}</div>}
    </div>
  )
}
