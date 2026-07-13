import { describe, expect, it } from 'vitest'
import { buildAgentIssueUrl } from './github-issue'

describe('buildAgentIssueUrl', () => {
  it('targets the Registry issue form with only title and body fields', () => {
    const url = new URL(buildAgentIssueUrl('problem', {
      id: 'coding-test-runner',
      title: 'Test Runner',
    }))

    expect(url.origin + url.pathname)
      .toBe('https://github.com/AgentsKit-io/agentskit-registry/issues/new')
    expect([...url.searchParams.keys()]).toEqual(['title', 'body'])
    expect(url.searchParams.get('title')).toBe('[Agent problem] Test Runner (coding-test-runner)')
    expect(url.searchParams.get('body')).toContain('- ID: `coding-test-runner`')
    expect(url.searchParams.get('body')).toContain('- Title: Test Runner')
    expect(url.searchParams.get('body'))
      .toContain('- Public URL: https://registry.agentskit.io/agents/coding-test-runner')
  })

  it('uses the right editable sections for each issue kind', () => {
    const context = { id: 'research-citations', title: 'Citation Research' }
    const problem = new URL(buildAgentIssueUrl('problem', context)).searchParams.get('body')
    const improvement = new URL(buildAgentIssueUrl('improvement', context)).searchParams.get('body')

    expect(problem).toContain('## What happened?')
    expect(problem).toContain('## What did you expect?')
    expect(improvement).toContain('## Suggested improvement')
    expect(improvement).toContain('## Why would this help?')
  })

  it('encodes special characters without changing their decoded values', () => {
    const url = buildAgentIssueUrl('improvement', {
      id: 'legal/a&b',
      title: 'Terms & Privacy + Review',
    })
    const parsed = new URL(url)

    expect(url).not.toContain('Terms & Privacy')
    expect(parsed.searchParams.get('title'))
      .toBe('[Agent improvement] Terms & Privacy + Review (legal/a&b)')
    expect(parsed.searchParams.get('body'))
      .toContain('https://registry.agentskit.io/agents/legal%2Fa%26b')
  })

  it('does not include arbitrary data or page query strings', () => {
    const context = {
      id: 'support-triage',
      title: 'Support Triage',
      comment: 'private customer transcript',
      category: 'support',
    }
    const url = buildAgentIssueUrl('problem', context)
    const body = new URL(url).searchParams.get('body') ?? ''

    expect(url).not.toContain('private')
    expect(body).not.toContain('customer transcript')
    expect(body).not.toContain('Category:')
    expect(body).toContain('- Public URL: https://registry.agentskit.io/agents/support-triage\n')
    expect(body).not.toContain('support-triage?')
  })
})
