const ISSUES_URL = 'https://github.com/AgentsKit-io/agentskit-registry/issues/new'
const REGISTRY_URL = 'https://registry.agentskit.io/agents'

export type AgentIssueKind = 'problem' | 'improvement'

export interface AgentIssueContext {
  id: string
  title: string
}

const ISSUE_SECTIONS: Record<AgentIssueKind, string> = {
  problem: `## What happened?
<!-- Describe the problem you found. -->

## What did you expect?
<!-- Describe the expected behavior. -->

## Additional context
<!-- Add any other useful context. -->`,
  improvement: `## Suggested improvement
<!-- Describe what you would change. -->

## Why would this help?
<!-- Explain the expected benefit. -->

## Additional context
<!-- Add any other useful context. -->`,
}

export function buildAgentIssueUrl(kind: AgentIssueKind, agent: AgentIssueContext): string {
  const publicUrl = `${REGISTRY_URL}/${encodeURIComponent(agent.id)}`
  const prefix = kind === 'problem' ? 'Agent problem' : 'Agent improvement'
  const body = `## Agent
- ID: \`${agent.id}\`
- Title: ${agent.title}
- Public URL: ${publicUrl}

${ISSUE_SECTIONS[kind]}`
  const params = new URLSearchParams({
    title: `[${prefix}] ${agent.title} (${agent.id})`,
    body,
  })

  return `${ISSUES_URL}?${params.toString()}`
}
