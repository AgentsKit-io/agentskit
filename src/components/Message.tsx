import React, { type ReactNode } from 'react'
import type { Message as MessageType } from '../core/types'

export interface MessageProps {
  message: MessageType
  avatar?: ReactNode
  actions?: ReactNode
}

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
