/**
 * Tests the catch branch (line 34) in MarkdownText.tsx.
 * Uses vi.mock to make marked.parse throw so we can verify the raw-content
 * fallback is returned rather than crashing.
 */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'

vi.mock('marked', async () => {
  const actual = await vi.importActual<typeof import('marked')>('marked')

  class ThrowingMarked extends actual.Marked {
    override parse(_src: string, _options?: Parameters<actual.Marked['parse']>[1]): string {
      throw new Error('simulated parse failure')
    }
  }

  return {
    ...actual,
    Marked: ThrowingMarked,
  }
})

// Import AFTER mock is registered so the module picks up the mocked Marked
const { MarkdownText } = await import('../src/components/MarkdownText')

describe('MarkdownText — catch branch', () => {
  it('falls back to raw content when marked.parse throws', () => {
    const { lastFrame } = render(<MarkdownText content="raw fallback content" />)
    expect(lastFrame()).toContain('raw fallback content')
  })
})
