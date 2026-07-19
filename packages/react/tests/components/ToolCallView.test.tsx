import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ToolCallView } from '../../src/components/ToolCallView'
import type { ToolCall } from '@agentskit/core'

const toolCall: ToolCall = {
  id: 'tc-1',
  name: 'search',
  args: { query: 'react arrow' },
  result: '3 results found',
  status: 'complete',
}

describe('ToolCallView', () => {
  it('renders the tool name', () => {
    render(<ToolCallView toolCall={toolCall} />)
    expect(screen.getByText('search')).toBeInTheDocument()
  })

  it('sets data-ak-tool-status attribute', () => {
    const { container } = render(<ToolCallView toolCall={toolCall} />)
    expect(container.firstElementChild).toHaveAttribute('data-ak-tool-status', 'complete')
  })

  it('exposes aria-expanded=false when collapsed', () => {
    render(<ToolCallView toolCall={toolCall} />)
    expect(screen.getByRole('button', { name: 'search' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles aria-expanded when details open and close', () => {
    render(<ToolCallView toolCall={toolCall} />)
    const toggle = screen.getByRole('button', { name: 'search' })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows args and result when expanded', () => {
    render(<ToolCallView toolCall={toolCall} />)
    fireEvent.click(screen.getByText('search'))
    expect(screen.getByText(/"query"/)).toBeInTheDocument()
    expect(screen.getByText('3 results found')).toBeInTheDocument()
  })

  it('omits result block when no result is present', () => {
    const pending: ToolCall = { ...toolCall, result: undefined, status: 'pending' }
    const { container } = render(<ToolCallView toolCall={pending} />)
    fireEvent.click(screen.getByText('search'))
    expect(container.querySelector('[data-ak-tool-args]')).not.toBeNull()
    expect(container.querySelector('[data-ak-tool-result]')).toBeNull()
  })

  it('isolates expand state across multi-instance mounts', () => {
    const other: ToolCall = { ...toolCall, id: 'tc-2', name: 'weather' }
    render(
      <>
        <ToolCallView toolCall={toolCall} />
        <ToolCallView toolCall={other} />
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'search' }))
    expect(screen.getByRole('button', { name: 'search' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'weather' })).toHaveAttribute('aria-expanded', 'false')
  })
})
