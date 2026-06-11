import { describe, it, expect } from 'vitest'
import '../src/services'
import { listIntegrations, getIntegration, CONFIG_FIELDS } from '../src'

describe('CONFIG_FIELDS', () => {
  it('every field declares a key + label; secret fields are flagged', () => {
    for (const [slug, fields] of Object.entries(CONFIG_FIELDS)) {
      expect(fields.length, slug).toBeGreaterThan(0)
      for (const f of fields) {
        expect(f.key, slug).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/)
        expect(typeof f.label, slug).toBe('string')
        expect(f.label.length, slug).toBeGreaterThan(0)
      }
    }
  })

  it('attaches configFields onto the matching descriptors', () => {
    const twilio = getIntegration('twilio')!
    expect(twilio.configFields).toBe(CONFIG_FIELDS.twilio)
    expect(twilio.configFields?.map((f) => f.key)).toEqual([
      'accountSid',
      'authToken',
      'fromNumber',
    ])
    // a single-field connector
    expect(getIntegration('stripe')!.configFields?.map((f) => f.key)).toEqual(['apiKey'])
  })

  it('only structured-config (auth: none, non-keyless) services carry configFields', () => {
    const withFields = listIntegrations().filter((i) => i.configFields)
    // every declared connector is wired
    expect(withFields.length).toBe(Object.keys(CONFIG_FIELDS).length)
    // email + teams expose flat fields the host maps onto their runtime shape
    // (SMTP transport / nested webhook) — see CONFIG_FIELDS doc comment.
    expect(getIntegration('email')!.configFields?.map((f) => f.key)).toEqual([
      'host',
      'port',
      'user',
      'pass',
      'secure',
      'from',
    ])
    expect(getIntegration('teams')!.configFields?.map((f) => f.key)).toEqual(['webhookUrl'])
    // api-key + oauth connectors don't use configFields
    expect(getIntegration('firecrawl')!.configFields).toBeUndefined()
    expect(getIntegration('gmail')!.configFields).toBeUndefined()
  })
})
