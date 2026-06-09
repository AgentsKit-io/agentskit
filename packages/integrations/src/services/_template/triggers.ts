import { defineTrigger } from '../../contract'

// One trigger per inbound event source. `verify` checks the webhook signature;
// `normalize` maps the raw provider payload to a uniform event. Delete this
// file (and the `triggers` field) for services with no inbound events.
export const templateEvent = defineTrigger({
  name: 'template.event',
  source: 'template',
  normalize: (raw) => ({ kind: 'event', payload: raw, raw }),
})

export const templateTriggers = [templateEvent]
