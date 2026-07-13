'use client'

import { useMemo, useRef, useState } from 'react'
import { buildAgentIssueUrl } from '@/lib/github-issue'
import { trackRegistryEvent } from '@/lib/posthog-client'

type FeedbackResponse = 'helpful' | 'not_helpful'

export function AgentFeedback({ agentId, agentTitle }: { agentId: string; agentTitle: string }) {
  const [response, setResponse] = useState<FeedbackResponse | null>(null)
  const submitted = useRef(false)
  const issueUrls = useMemo(() => ({
    problem: buildAgentIssueUrl('problem', { id: agentId, title: agentTitle }),
    improvement: buildAgentIssueUrl('improvement', { id: agentId, title: agentTitle }),
  }), [agentId, agentTitle])

  function submit(nextResponse: FeedbackResponse) {
    if (submitted.current) return
    submitted.current = true
    setResponse(nextResponse)
    trackRegistryEvent('registry_agent_feedback_submitted', {
      agent_id: agentId,
      response: nextResponse,
    })
  }

  const negative = response === 'not_helpful'

  return (
    <section aria-labelledby="agent-feedback-title" className="mt-10 border-y border-ak-border py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="agent-feedback-title" className="text-sm font-semibold text-ak-foam">Was this agent useful?</h2>
          <p className="mt-1 text-sm text-ak-graphite" aria-live="polite">
            {response
              ? negative ? 'Thanks. Report the problem below so we can investigate.' : 'Thanks for your feedback.'
              : 'Your response helps us prioritize agent quality.'}
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Rate this agent">
          <button
            type="button"
            onClick={() => submit('helpful')}
            disabled={response !== null}
            aria-pressed={response === 'helpful'}
            className="min-h-9 rounded-md border border-ak-border px-3 text-sm font-medium text-ak-foam hover:border-ak-blue disabled:cursor-default disabled:opacity-60 aria-pressed:border-ak-green aria-pressed:text-ak-green"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => submit('not_helpful')}
            disabled={response !== null}
            aria-pressed={negative}
            className="min-h-9 rounded-md border border-ak-border px-3 text-sm font-medium text-ak-foam hover:border-ak-blue disabled:cursor-default disabled:opacity-60 aria-pressed:border-ak-red aria-pressed:text-ak-red"
          >
            No
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-ak-border pt-4 text-sm">
        <a
          href={issueUrls.problem}
          target="_blank"
          rel="noreferrer"
          className={negative
            ? 'font-semibold text-ak-red underline underline-offset-4'
            : 'text-ak-blue hover:underline'}
        >
          Report a problem
        </a>
        <a href={issueUrls.improvement} target="_blank" rel="noreferrer" className="text-ak-blue hover:underline">
          Suggest an improvement
        </a>
      </div>
    </section>
  )
}
