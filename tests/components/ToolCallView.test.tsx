import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ToolCallView } from '../../src/components/ToolCallView'
import type { ToolCall } from '../../src/core/types'

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

  it('sets data-ra-tool-status attribute', () => {
    const { container } = render(<ToolCallView toolCall={toolCall} />)
    expect(container.firstElementChild).toHaveAttribute('data-ra-tool-status', 'complete')
  })

  it('shows args and result when expanded', () => {
    render(<ToolCallView toolCall={toolCall} />)
    fireEvent.click(screen.getByText('search'))
    expect(screen.getByText(/"query"/)).toBeInTheDocument()
    expect(screen.getByText('3 results found')).toBeInTheDocument()
  })
})
