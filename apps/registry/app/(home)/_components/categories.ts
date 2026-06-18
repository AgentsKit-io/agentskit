export const CATEGORY: Record<string, { label: string; blurb: string; icon: string }> = {
  coding: { label: 'Coding', blurb: 'Reviews, tests, PRs, and release flow for engineering teams.', icon: 'code' },
  research: { label: 'Research', blurb: 'Citation-first web research with every claim anchored to a source.', icon: 'search' },
  marketing: { label: 'Marketing', blurb: 'Briefs, copy, competitive research, and social publishing.', icon: 'trending-up' },
  agency: { label: 'Agency', blurb: 'Client briefs, decks, schedules, and creative review.', icon: 'megaphone' },
  support: { label: 'Support', blurb: 'Ticket triage, KB search, and escalation drafting.', icon: 'life-buoy' },
  legal: { label: 'Legal', blurb: 'Contract review, discovery, drafting, and privilege spotting.', icon: 'scale' },
  fintech: { label: 'Fintech', blurb: 'KYC, sanctions, fraud, and transaction monitoring.', icon: 'landmark' },
  clinical: { label: 'Clinical', blurb: 'Intake triage, SOAP notes, redaction, and referrals.', icon: 'heart-pulse' },
  ops: { label: 'Ops', blurb: 'Internal workflows and knowledge promotion.', icon: 'git-branch' },
}

const ORDER = ['coding', 'research', 'marketing', 'agency', 'support', 'legal', 'fintech', 'clinical', 'ops']

export function categoryMeta(id: string) {
  return CATEGORY[id] ?? { label: id.charAt(0).toUpperCase() + id.slice(1), blurb: '', icon: 'box' }
}

export function sortedCategories(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => {
    const ai = ORDER.indexOf(a)
    const bi = ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

export function agentPrompt(a: { id: string; title: string; description: string }): string {
  return [
    `Install the "${a.title}" agent from the AgentsKit registry and wire it into this project.`,
    ``,
    `1. Run: npx agentskit add ${a.id}`,
    `2. It copies the source into ./agents/${a.id}/ (you own the code — shadcn-style).`,
    `3. Import the factory from ./agents/${a.id}/agent and construct it with an adapter`,
    `   (e.g. openai({ apiKey: process.env.OPENAI_API_KEY })).`,
    ``,
    `What it does: ${a.description}`,
    `Bundle (JSON): https://registry.agentskit.io/r/${a.id}.json`,
    `Docs: https://registry.agentskit.io/agents/${a.id}`,
  ].join('\n')
}
