export interface TeamsAdaptiveCardAction {
  type: 'Action.OpenUrl' | 'Action.Submit'
  title: string
  url?: string
  data?: Record<string, unknown>
}

export interface TeamsAdaptiveCard {
  contentType: 'application/vnd.microsoft.card.adaptive'
  content: {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json'
    type: 'AdaptiveCard'
    version: '1.5'
    body: Array<Record<string, unknown>>
    actions?: TeamsAdaptiveCardAction[]
  }
}

export interface TeamsMessageCard {
  contentType: 'application/vnd.microsoft.teams.card.o365connector'
  content: {
    '@type': 'MessageCard'
    '@context': 'https://schema.org/extensions'
    summary?: string
    themeColor?: string
    title?: string
    text?: string
  }
}

/** Build a Teams Adaptive Card payload (v1.5). */
export function adaptiveCard(input: {
  title?: string
  text?: string
  facts?: Array<{ title: string; value: string }>
  actions?: TeamsAdaptiveCardAction[]
}): TeamsAdaptiveCard {
  const body: Array<Record<string, unknown>> = []
  if (input.title) body.push({ type: 'TextBlock', size: 'Large', weight: 'Bolder', text: input.title, wrap: true })
  if (input.text) body.push({ type: 'TextBlock', text: input.text, wrap: true })
  if (input.facts && input.facts.length > 0) body.push({ type: 'FactSet', facts: input.facts })
  return {
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.5',
      body,
      ...(input.actions && input.actions.length > 0 ? { actions: input.actions } : {}),
    },
  }
}

/** Build a legacy O365 connector MessageCard. */
export function messageCard(input: {
  title?: string
  text?: string
  summary?: string
  themeColor?: string
}): TeamsMessageCard {
  return {
    contentType: 'application/vnd.microsoft.teams.card.o365connector',
    content: {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: input.summary ?? input.title ?? 'Notification',
      themeColor: input.themeColor,
      title: input.title,
      text: input.text,
    },
  }
}

export interface TeamsBotMessage {
  conversationId: string
  serviceUrl?: string
  text?: string
  card?: TeamsAdaptiveCard | TeamsMessageCard
  replyToId?: string
}

export interface TeamsBotSendResult {
  id: string
  conversationId: string
}

export interface TeamsBotClient {
  send: (msg: TeamsBotMessage) => Promise<TeamsBotSendResult>
}

/** Per-call config carried on ctx.config for the Teams actions. */
export interface TeamsRuntimeConfig {
  webhook?: { webhookUrl: string; headers?: Record<string, string>; timeoutMs?: number }
  bot?: { client: TeamsBotClient }
}
