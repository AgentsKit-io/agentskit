export type AgentFeedbackResponse = 'helpful' | 'not_helpful'

export function claimFeedbackSubmission(submitted: { current: boolean }): boolean {
  if (submitted.current) return false
  submitted.current = true
  return true
}

export function agentFeedbackMessage(response: AgentFeedbackResponse | null): string {
  if (response === 'not_helpful') return 'Thanks. Report the problem below so we can investigate.'
  if (response === 'helpful') return 'Thanks for your feedback.'
  return 'Your response helps us prioritize agent quality.'
}
