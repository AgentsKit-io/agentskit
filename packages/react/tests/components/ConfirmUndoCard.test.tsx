import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { ConfirmUndoCard } from '../../src/components/ConfirmUndoCard'

afterEach(() => vi.useRealTimers())

function setup(extra = {}) {
  const fns = { onApprove: vi.fn(), onDeny: vi.fn(), onUndo: vi.fn() }
  render(
    <ConfirmUndoCard
      title="Archive project"
      approveLabel="Yes"
      denyLabel="No"
      undoLabel="Take back"
      doneLabel="Done"
      undoneLabel="Reverted"
      formatRemaining={s => `${s}s left`}
      undoWindowMs={3000}
      {...fns}
      {...extra}
    />,
  )
  return fns
}

describe('ConfirmUndoCard', () => {
  it('shows only approve/deny before approval', () => {
    setup()
    expect(screen.getByText('Yes')).toBeTruthy()
    expect(screen.queryByText('Take back')).toBeNull()
  })

  it('calls onDeny', () => {
    const f = setup()
    fireEvent.click(screen.getByText('No'))
    expect(f.onDeny).toHaveBeenCalledOnce()
  })

  it('shows undo after approval and calls onUndo', () => {
    const f = setup()
    fireEvent.click(screen.getByText('Yes'))
    expect(f.onApprove).toHaveBeenCalledOnce()
    expect(screen.getByText('3s left')).toBeTruthy()
    fireEvent.click(screen.getByText('Take back'))
    expect(f.onUndo).toHaveBeenCalledOnce()
    expect(screen.getByText('Reverted')).toBeTruthy()
  })

  it('removes undo when the window expires', () => {
    vi.useFakeTimers()
    const f = setup()
    fireEvent.click(screen.getByText('Yes'))
    act(() => { vi.advanceTimersByTime(3500) })
    expect(screen.queryByText('Take back')).toBeNull()
    expect(screen.getByText('Done')).toBeTruthy()
    expect(f.onUndo).not.toHaveBeenCalled()
  })
})
