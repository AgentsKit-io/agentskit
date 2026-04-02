import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ThinkingIndicator } from '../../src/components/ThinkingIndicator'

describe('ThinkingIndicator', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(<ThinkingIndicator visible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders indicator when visible is true', () => {
    render(<ThinkingIndicator visible />)
    expect(screen.getByTestId('ak-thinking')).toBeInTheDocument()
  })

  it('renders custom label', () => {
    render(<ThinkingIndicator visible label="Generating..." />)
    expect(screen.getByText('Generating...')).toBeInTheDocument()
  })
})
