import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { CodeBlock } from '../../src/components/CodeBlock'

describe('CodeBlock', () => {
  it('renders code content in a pre > code structure', () => {
    render(<CodeBlock code="const x = 1" />)
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
    const code = screen.getByText('const x = 1')
    expect(code.tagName).toBe('CODE')
    expect(code.parentElement?.tagName).toBe('PRE')
  })

  it('sets data-ra-language attribute when language is provided', () => {
    const { container } = render(<CodeBlock code="x = 1" language="python" />)
    expect(container.querySelector('[data-ra-code-block]')).toHaveAttribute('data-ra-language', 'python')
  })

  it('renders copy button when copyable is true', () => {
    render(<CodeBlock code="test" copyable />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
