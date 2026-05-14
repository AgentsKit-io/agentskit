import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('sets data-ak-language attribute when language is provided', () => {
    const { container } = render(<CodeBlock code="x = 1" language="python" />)
    expect(container.querySelector('[data-ak-code-block]')).toHaveAttribute('data-ak-language', 'python')
  })

  it('renders copy button when copyable is true', () => {
    render(<CodeBlock code="test" copyable />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('does not render copy button when copyable is false (default)', () => {
    render(<CodeBlock code="test" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('calls navigator.clipboard.writeText with code when Copy is clicked', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<CodeBlock code="const y = 2" copyable />)
    fireEvent.click(screen.getByRole('button'))
    expect(writeText).toHaveBeenCalledWith('const y = 2')
  })
})
