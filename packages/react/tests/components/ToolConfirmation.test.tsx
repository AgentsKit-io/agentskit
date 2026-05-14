import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ToolConfirmation } from '../../src/components/ToolConfirmation'
import type { ToolCall } from '@agentskit/core'

const pendingToolCall: ToolCall = {
  id: 'tc-1',
  name: 'delete_file',
  args: { path: '/tmp/test.txt' },
  status: 'requires_confirmation',
}

const completedToolCall: ToolCall = {
  id: 'tc-2',
  name: 'delete_file',
  args: { path: '/tmp/test.txt' },
  status: 'complete',
}

describe('ToolConfirmation', () => {
  it('renders nothing when status is not requires_confirmation', () => {
    const { container } = render(
      <ToolConfirmation
        toolCall={completedToolCall}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders confirmation UI when status is requires_confirmation', () => {
    render(
      <ToolConfirmation
        toolCall={pendingToolCall}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />
    )
    expect(screen.getByText('delete_file')).toBeInTheDocument()
    expect(screen.getByText('requires confirmation')).toBeInTheDocument()
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Deny')).toBeInTheDocument()
  })

  it('sets data-ak-tool-name attribute to the tool name', () => {
    const { container } = render(
      <ToolConfirmation
        toolCall={pendingToolCall}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />
    )
    expect(container.firstElementChild).toHaveAttribute('data-ak-tool-name', 'delete_file')
    expect(container.firstElementChild).toHaveAttribute('data-ak-tool-confirmation')
  })

  it('displays tool args as JSON', () => {
    render(
      <ToolConfirmation
        toolCall={pendingToolCall}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />
    )
    expect(screen.getByText(/"path"/)).toBeInTheDocument()
    expect(screen.getByText(/\/tmp\/test\.txt/)).toBeInTheDocument()
  })

  it('calls onApprove with toolCallId when Approve is clicked', () => {
    const onApprove = vi.fn()
    render(
      <ToolConfirmation
        toolCall={pendingToolCall}
        onApprove={onApprove}
        onDeny={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Approve'))
    expect(onApprove).toHaveBeenCalledWith('tc-1')
  })

  it('calls onDeny with toolCallId when Deny is clicked', () => {
    const onDeny = vi.fn()
    render(
      <ToolConfirmation
        toolCall={pendingToolCall}
        onApprove={vi.fn()}
        onDeny={onDeny}
      />
    )
    fireEvent.click(screen.getByText('Deny'))
    expect(onDeny).toHaveBeenCalledWith('tc-1')
  })
})
