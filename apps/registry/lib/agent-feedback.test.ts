import { describe, expect, it } from 'vitest'
import { agentFeedbackMessage, claimFeedbackSubmission } from './agent-feedback'

describe('agent feedback state', () => {
  it('allows only the first synchronous submission', () => {
    const submitted = { current: false }

    expect(claimFeedbackSubmission(submitted)).toBe(true)
    expect(claimFeedbackSubmission(submitted)).toBe(false)
    expect(submitted.current).toBe(true)
  })

  it('returns accessible status copy for every state', () => {
    expect(agentFeedbackMessage(null)).toBe('Your response helps us prioritize agent quality.')
    expect(agentFeedbackMessage('helpful')).toBe('Thanks for your feedback.')
    expect(agentFeedbackMessage('not_helpful'))
      .toBe('Thanks. Report the problem below so we can investigate.')
  })
})
