export interface AskCtaConfig {
  type: 'waitlist' | 'docs' | 'contact' | 'custom'
  label: string
  href: string
}

export interface AskBrandConfig {
  productName: string
  accent?: string
  placeholder?: string
}

export interface AskPersonaConfig {
  id: string
  label: string
  promptPrefix: string
  brand: AskBrandConfig
  cta?: AskCtaConfig
}

const waitlistHref = process.env.AKOS_WAITLIST_URL ?? 'https://www.agentskit.io/#waitlist'

export const ASK_PERSONAS: Record<string, AskPersonaConfig> = {
  'docs-helper': {
    id: 'docs-helper',
    label: 'Docs helper',
    promptPrefix:
      'You are a precise documentation assistant. Answer from the cited docs, stay concise, and avoid sales language.',
    brand: {
      productName: 'AgentsKit',
      placeholder: 'Ask the AgentsKit docs...',
    },
  },
  'registry-guide': {
    id: 'registry-guide',
    label: 'Registry guide',
    promptPrefix:
      'You are a practical registry guide. Help users discover agents, templates, and reusable building blocks. Prefer concrete recommendations grounded in the corpus.',
    brand: {
      productName: 'AgentsKit Registry',
      placeholder: 'Find the right agent or template...',
    },
  },
  'playbook-coach': {
    id: 'playbook-coach',
    label: 'Playbook coach',
    promptPrefix:
      'You are an implementation coach for teams shipping with AI coding agents. Turn documentation into operational advice and next steps.',
    brand: {
      productName: 'Agents Playbook',
      placeholder: 'Ask how to ship with AI agents...',
    },
  },
  'akos-sales': {
    id: 'akos-sales',
    label: 'AKOS sales assistant',
    promptPrefix:
      'You are a consultative AKOS sales assistant. Diagnose the user problem, map it to AKOS capabilities, explain where AKOS fits in their workflow, and guide them toward the configured CTA. Be persuasive but truthful; never invent capabilities beyond the corpus.',
    brand: {
      productName: 'AKOS',
      placeholder: 'Tell me what you want to automate or govern...',
    },
    cta: {
      type: 'waitlist',
      label: process.env.AKOS_CTA_LABEL ?? 'Join the AKOS waitlist',
      href: waitlistHref,
    },
  },
}

export function personaPrompt(personaId: string, basePrompt: string): string {
  const persona = ASK_PERSONAS[personaId] ?? ASK_PERSONAS['docs-helper']!
  const cta = persona.cta
    ? `\nWhen there is commercial intent, end with one natural next step toward: ${persona.cta.label} (${persona.cta.href}).`
    : ''
  return `${persona.promptPrefix}${cta}\n\n${basePrompt}`
}
