import { describe, expect, it } from 'vitest'
import { queryLengthBucket, sanitizeAnalyticsCapture, sanitizeAnalyticsUrl } from './analytics'

describe('analytics privacy', () => {
  it('removes query strings and hashes from absolute and relative URLs', () => {
    expect(sanitizeAnalyticsUrl('https://registry.agentskit.io/?q=private+task&category=legal#agents'))
      .toBe('/')
    expect(sanitizeAnalyticsUrl('/compare?agents=one,two#matrix')).toBe('/compare')
  })

  it('sanitizes URL and autocapture text properties without mutating input', () => {
    const capture = {
      event: '$pageview',
      properties: {
        $current_url: 'https://registry.agentskit.io/?q=confidential',
        $initial_current_url: 'https://registry.agentskit.io/?q=first-secret',
        $session_entry_url: 'https://registry.agentskit.io/?q=session-secret',
        $referrer: 'https://example.com/path?token=secret',
        ph_keyword: 'medical diagnosis',
        utm_campaign: 'customer-name',
        $element_text: 'confidential',
        $elements: [{ text: 'confidential' }],
        $session_entry_referrer: 'https://google.com/search?q=medical+diagnosis',
        $session_entry_utm_campaign: 'customer-name',
        $initial_utm_content: 'private-content',
        $initial_gclid: 'click-secret',
        $unexpected_free_text: 'patient diagnosis',
        safe: 'value',
        $set: {
          $referrer: 'https://example.com/?secret=nested',
          $survey_response: 'patient diagnosis',
          profile_name: 'private',
        },
        token: 'project-token',
        distinct_id: 'anonymous-id',
      },
      $set_once: {
        $initial_current_url: 'https://registry.agentskit.io/?q=profile-secret',
        $session_entry_utm_source: 'private-source',
        $unexpected_free_text: 'private profile',
      },
    }
    const sanitized = sanitizeAnalyticsCapture(capture)
    expect(sanitized.properties).toEqual({
      $current_url: '/',
      $initial_current_url: '/',
      $session_entry_url: '/',
      $set: {},
      token: 'project-token',
      distinct_id: 'anonymous-id',
    })
    expect(capture.properties.$current_url).toContain('confidential')
    expect(sanitized.$set_once).toEqual({ $initial_current_url: '/' })
  })

  it('reports only coarse search-length buckets', () => {
    expect([1, 10, 11, 25, 26, 50, 51].map(queryLengthBucket))
      .toEqual(['1-10', '1-10', '11-25', '11-25', '26-50', '26-50', '51+'])
  })

  it('allows only declared custom properties for registry events', () => {
    const sanitized = sanitizeAnalyticsCapture({
      event: 'registry_catalog_search_used',
      properties: {
        query: 'private medical question',
        query_length: '11-25',
        result_count: 3,
        distinct_id: 'anonymous-id',
      },
    })
    expect(sanitized.properties).toEqual({
      query_length: '11-25',
      result_count: 3,
      distinct_id: 'anonymous-id',
    })
  })

  it('allows only the structured agent feedback fields', () => {
    const sanitized = sanitizeAnalyticsCapture({
      event: 'registry_agent_feedback_submitted',
      properties: {
        agent_id: 'legal-contract-reviewer',
        response: 'not_helpful',
        comment: 'private contract text',
        issue_body: 'customer details',
        query: 'confidential search',
        $current_url: 'https://registry.agentskit.io/agents/legal-contract-reviewer?source=private',
      },
    })

    expect(sanitized.properties).toEqual({
      agent_id: 'legal-contract-reviewer',
      response: 'not_helpful',
      $current_url: '/agents/legal-contract-reviewer',
    })
  })
})
