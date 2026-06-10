import { describe, it, expect } from 'vitest'
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
