import { describe, it, expect } from 'vitest'
import { OAUTH_SPECS } from '../src/oauth-specs'
import { githubIntegration } from '../src/services/github/index'
import { jiraIntegration } from '../src/services/jira/index'
import { gmailIntegration } from '../src/services/gmail/index'
import { listIntegrations } from '../src/registry'
import '../src/services' // side-effect: register the full catalog

describe('oauth specs', () => {
  it('every spec has https authorize + token urls and a scopes array', () => {
    for (const [key, spec] of Object.entries(OAUTH_SPECS)) {
      expect(spec.authorizationUrl, key).toMatch(/^https:\/\//)
      expect(spec.tokenUrl, key).toMatch(/^https:\/\//)
      expect(Array.isArray(spec.defaultScopes), key).toBe(true)
      expect(typeof spec.usePkce, key).toBe('boolean')
    }
  })

  it('attaches the right spec to descriptors via the oauth field', () => {
    expect(githubIntegration.oauth).toBe(OAUTH_SPECS.github)
    expect(jiraIntegration.oauth?.extraAuthParams).toEqual({ audience: 'api.atlassian.com', prompt: 'consent' })
    expect(gmailIntegration.oauth).toBe(OAUTH_SPECS.google) // gmail uses the shared Google spec
  })

  it('the oauth registry covers the OAuth-capable services in the catalog', () => {
    const withOauth = listIntegrations().filter((i) => i.oauth).map((i) => i.name).sort()
    expect(withOauth).toEqual(expect.arrayContaining(['github', 'slack', 'jira', 'gmail', 'salesforce', 'dropbox']))
  })
})
