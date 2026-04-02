import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Markdown } from '../../src/components/Markdown'

describe('Markdown', () => {
  it('renders plain text content', () => {
    render(<Markdown content="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('sets data-ak-markdown attribute', () => {
    const { container } = render(<Markdown content="test" />)
    expect(container.firstElementChild).toHaveAttribute('data-ak-markdown')
  })

  it('sets data-ak-streaming attribute when streaming', () => {
    const { container } = render(<Markdown content="partial..." streaming />)
    expect(container.firstElementChild).toHaveAttribute('data-ak-streaming', 'true')
  })
})
