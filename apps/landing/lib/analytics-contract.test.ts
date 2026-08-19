import { describe, expect, it } from 'vitest'
import { getAttributionSnapshot, isTrackingAllowed, withInternalReference } from './analytics-contract'

describe('analytics contract', () => {
  it('captures allowlisted attribution fields without the raw referrer', () => {
    expect(
      getAttributionSnapshot(
        { pathname: '/docs', search: '?utm_source=devto&utm_campaign=ecosystem_activation_2026q3&q=private' },
        'https://dev.to/article?token=private',
      ),
    ).toEqual({
      landing_path: '/docs',
      referrer_domain: 'dev.to',
      utm_source: 'devto',
      utm_campaign: 'ecosystem_activation_2026q3',
    })
  })

  it('does not treat an untagged direct visit as attributed', () => {
    expect(getAttributionSnapshot({ pathname: '/', search: '' }, '')).toBeNull()
  })

  it('adds internal reference context without replacing UTMs', () => {
    expect(
      withInternalReference(
        'https://registry.agentskit.io/?utm_source=devto&utm_campaign=ecosystem_editorial_2026q3',
        'ecosystem-card',
        'registry',
      ),
    ).toBe(
      'https://registry.agentskit.io/?utm_source=devto&utm_campaign=ecosystem_editorial_2026q3&ak_ref_source=agentskit&ak_ref_surface=ecosystem-card&ak_destination=registry',
    )
  })

  it('honors Do Not Track while allowing unspecified browser preferences', () => {
    expect(isTrackingAllowed('1')).toBe(false)
    expect(isTrackingAllowed('0')).toBe(true)
    expect(isTrackingAllowed(undefined)).toBe(true)
    expect(isTrackingAllowed('1', true)).toBe(true)
  })
})
