import { describe, it, expect } from 'vitest'
import type { ToolDefinition } from '@agentskit/core'
import type { IntegrationAction, IntegrationActionContext, SideEffect } from '../src/contract'
import { defineAction } from '../src/contract'
import { actionToToolDefinition, httpOptionsFor } from '../src/project/to-tool-definitions'
import { integrationTools, integrationToolsFromEnv, credentialEnvVar } from '../src/project/integration-tools'
import { slackIntegration } from '../src/services/slack/index'
import { githubIntegration } from '../src/services/github/index'
import { gmailIntegration } from '../src/services/gmail/index'
import { mapsIntegration } from '../src/services/maps/index'

describe('integrationTools', () => {
  it('projects by slug and by descriptor', () => {
    expect(integrationTools('slack', { credential: 'x' }).map(t => t.name)).toContain('slack_post_message')
    expect(integrationTools(slackIntegration).map(t => t.name)).toContain('slack_search')
  })
  it('throws on unknown slug', () => {
    expect(() => integrationTools('nope')).toThrow(/unknown integration/)
  })

  it('propagates caller cancellation to the bound HTTP client', () => {
    const signal = new AbortController().signal
    expect(httpOptionsFor(slackIntegration, { signal }).signal).toBe(signal)
  })
})

describe('credentialEnvVar', () => {
  it('returns the apiKey envHint, undefined for oauth2', () => {
    expect(credentialEnvVar(githubIntegration)).toBe('GITHUB_TOKEN')
    expect(credentialEnvVar(gmailIntegration)).toBeUndefined()
    expect(credentialEnvVar(mapsIntegration)).toBeUndefined()
  })
})

describe('integrationToolsFromEnv', () => {
  it('finds the credential from env', () => {
    const r = integrationToolsFromEnv('github', { GITHUB_TOKEN: 'ghp' })
    expect(r.credentialFound).toBe(true)
    expect(r.envVar).toBe('GITHUB_TOKEN')
    expect(r.tools.length).toBeGreaterThan(0)
  })
  it('reports a missing apiKey credential', () => {
    const r = integrationToolsFromEnv('github', {})
    expect(r.credentialFound).toBe(false)
    expect(r.envVar).toBe('GITHUB_TOKEN')
    expect(r.tools.length).toBeGreaterThan(0)
  })
  it('treats no-auth integrations as always satisfied', () => {
    const r = integrationToolsFromEnv('maps', {})
    expect(r.credentialFound).toBe(true)
    expect(r.envVar).toBeUndefined()
  })
  it('throws on unknown slug', () => {
    expect(() => integrationToolsFromEnv('nope', {})).toThrow(/unknown integration/)
  })
})

const projectionCtx: IntegrationActionContext = {
  http: async () => ({}),
  fetch: globalThis.fetch,
  config: undefined,
}

function projectAction(
  sideEffect: SideEffect,
  requiresConfirmation?: boolean,
): ToolDefinition {
  const action: IntegrationAction = defineAction({
    name: `fixture_${sideEffect}`,
    description: `fixture action (${sideEffect})`,
    schema: { type: 'object', properties: {}, additionalProperties: false },
    sideEffect,
    ...(requiresConfirmation !== undefined ? { requiresConfirmation } : {}),
    execute: async () => null,
  })
  return actionToToolDefinition(action, projectionCtx)
}

describe('tool projection confirmation policy', () => {
  it('does not require confirmation for sideEffect none/read unless explicitly requested', () => {
    expect(projectAction('none').requiresConfirmation).toBeFalsy()
    expect(projectAction('read').requiresConfirmation).toBeFalsy()
    expect(projectAction('none', false).requiresConfirmation).toBeFalsy()
    expect(projectAction('read', false).requiresConfirmation).toBeFalsy()
  })

  it('always requires confirmation for write/external/destructive (even when omitted or false)', () => {
    for (const sideEffect of ['write', 'external', 'destructive'] as const) {
      expect(
        projectAction(sideEffect).requiresConfirmation,
        `${sideEffect} omits requiresConfirmation`,
      ).toBe(true)
      expect(
        projectAction(sideEffect, false).requiresConfirmation,
        `${sideEffect} explicitly sets requiresConfirmation: false`,
      ).toBe(true)
      expect(
        projectAction(sideEffect, true).requiresConfirmation,
        `${sideEffect} explicitly sets requiresConfirmation: true`,
      ).toBe(true)
    }
  })

  it('keeps an explicitly confirmed read action confirmed', () => {
    expect(projectAction('read', true).requiresConfirmation).toBe(true)
    expect(projectAction('none', true).requiresConfirmation).toBe(true)
  })
})
