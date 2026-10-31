import React, { useEffect, useState } from 'react'

/** Props for confirming a reversible action and offering a time-limited undo. */
export interface ConfirmUndoCardProps {
  title: string
  description?: string
  approveLabel: string
  denyLabel: string
  undoLabel: string
  /** Text shown after the undo window closes without an undo. */
  doneLabel?: string
  /** Text shown after the action was undone. */
  undoneLabel?: string
  /** Builds the countdown text from the seconds left, e.g. `s => \`Undo in ${s}s\``. */
  formatRemaining?: (seconds: number) => string
  /** How long the undo stays available after approval. Default 5000 ms. */
  undoWindowMs?: number
  onApprove: () => void
  onDeny: () => void
  onUndo: () => void
}

type Phase = 'pending' | 'undoable' | 'done' | 'undone' | 'denied'

/**
 * Approve or deny an action; after approval, offer an undo until the window closes.
 * @param props Labels, undo window, and callbacks.
 * @returns The card element.
 */
export function ConfirmUndoCard({
  title,
  description,
  approveLabel,
  denyLabel,
  undoLabel,
  doneLabel,
  undoneLabel,
  formatRemaining,
  undoWindowMs = 5000,
  onApprove,
  onDeny,
  onUndo,
}: ConfirmUndoCardProps) {
  const [phase, setPhase] = useState<Phase>('pending')
  const [remainingMs, setRemainingMs] = useState(undoWindowMs)

  useEffect(() => {
    if (phase !== 'undoable') return
    const deadline = Date.now() + undoWindowMs
    const tick = setInterval(() => {
      const left = deadline - Date.now()
      if (left <= 0) {
        clearInterval(tick)
        setPhase('done')
      } else {
        setRemainingMs(left)
      }
    }, 250)
    return () => clearInterval(tick)
  }, [phase, undoWindowMs])

  const approve = () => {
    setRemainingMs(undoWindowMs)
    setPhase('undoable')
    onApprove()
  }
  const deny = () => {
    setPhase('denied')
    onDeny()
  }
  const undo = () => {
    setPhase('undone')
    onUndo()
  }

  const statusLabels: Partial<Record<typeof phase, string>> = { done: doneLabel, undone: undoneLabel }
  const statusText = statusLabels[phase]

  return (
    <div data-ak-confirm-undo data-ak-state={phase}>
      <span data-ak-confirm-undo-title>{title}</span>
      {description ? <span data-ak-confirm-undo-description>{description}</span> : null}
      {phase === 'pending' ? (
        <div data-ak-confirm-undo-actions>
          <button data-ak-confirm-undo-approve onClick={approve}>{approveLabel}</button>
          <button data-ak-confirm-undo-deny onClick={deny}>{denyLabel}</button>
        </div>
      ) : null}
      {phase === 'undoable' ? (
        <div data-ak-confirm-undo-actions>
          <button data-ak-confirm-undo-undo onClick={undo}>{undoLabel}</button>
          {formatRemaining && (
            <span data-ak-confirm-undo-remaining>{formatRemaining(Math.ceil(remainingMs / 1000))}</span>
          )}
        </div>
      ) : null}
      {statusText ? <span data-ak-confirm-undo-status>{statusText}</span> : null}
    </div>
  )
}
