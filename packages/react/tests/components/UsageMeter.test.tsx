import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { UsageMeter } from '../../src/components/UsageMeter'

const base = { label: 'Usage', warningLabel: 'Almost out', outLabel: 'Out of quota' }

describe('UsageMeter', () => {
  it('shows the percentage in the ok state', () => {
    const { container } = render(<UsageMeter {...base} window={{ spentUsd: 5, capUsd: 10 }} />)
    expect(screen.getByText('50%')).toBeTruthy()
    expect(container.querySelector('[data-ak-state="ok"]')).toBeTruthy()
    expect(screen.queryByText('Almost out')).toBeNull()
  })

  it('switches to warning at the default 80% threshold', () => {
    const { container } = render(<UsageMeter {...base} window={{ spentUsd: 8, capUsd: 10 }} />)
    expect(container.querySelector('[data-ak-state="warning"]')).toBeTruthy()
    expect(screen.getByText('Almost out')).toBeTruthy()
  })

  it('honours a custom threshold', () => {
    const { container } = render(
      <UsageMeter {...base} warningThreshold={0.5} window={{ spentUsd: 5, capUsd: 10 }} />,
    )
    expect(container.querySelector('[data-ak-state="warning"]')).toBeTruthy()
  })

  it('switches to out at 100% and caps the display', () => {
    const { container } = render(
      <UsageMeter {...base} window={{ spentUsd: 12, capUsd: 10, utilization: 1.2 }} />,
    )
    expect(container.querySelector('[data-ak-state="out"]')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()
    expect(screen.getByText('Out of quota')).toBeTruthy()
  })

  it('renders nothing without a cap', () => {
    const { container } = render(<UsageMeter {...base} window={{ spentUsd: 1 }} />)
    expect(container.firstChild).toBeNull()
  })
})
