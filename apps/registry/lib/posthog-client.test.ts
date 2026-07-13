import { beforeEach, describe, expect, it, vi } from 'vitest'

const posthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }))
vi.mock('posthog-js', () => ({ default: posthog }))

describe('PostHog client', () => {
  beforeEach(() => {
    vi.resetModules()
    posthog.init.mockReset()
    posthog.capture.mockReset()
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://posthog.example'
    vi.stubGlobal('window', {})
  })

  it('initializes before a direct-entry agent event and only initializes once', async () => {
    const { trackRegistryEvent, trackRegistryPageView } = await import('./posthog-client')
    trackRegistryEvent('registry_agent_opened', {
      agent_id: 'coding-test-runner',
      category: 'coding',
      reviewed: true,
      runnable: true,
    })
    trackRegistryPageView('/agents/coding-test-runner')

    expect(posthog.init).toHaveBeenCalledOnce()
    expect(posthog.init.mock.invocationCallOrder[0]).toBeLessThan(posthog.capture.mock.invocationCallOrder[0])
    expect(posthog.capture).toHaveBeenNthCalledWith(1, 'registry_agent_opened', expect.objectContaining({ agent_id: 'coding-test-runner' }))
    expect(posthog.capture).toHaveBeenNthCalledWith(2, '$pageview', { $current_url: '/agents/coding-test-runner' })
  })

  it('uses the privacy-minimized SDK configuration', async () => {
    const { initPostHog } = await import('./posthog-client')
    expect(initPostHog()).toBe(true)
    expect(posthog.init).toHaveBeenCalledWith('phc_test', expect.objectContaining({
      advanced_disable_flags: true,
      autocapture: false,
      capture_exceptions: false,
      capture_pageleave: false,
      capture_pageview: false,
      disable_conversations: true,
      disable_external_dependency_loading: true,
      disable_product_tours: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      person_profiles: 'never',
      save_campaign_params: false,
      save_referrer: false,
    }))
  })
})
