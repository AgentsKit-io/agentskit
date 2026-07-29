import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'

const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')

describe('release workflow authentication', () => {
  test('creates a short-lived token from the dedicated release app', () => {
    assert.match(
      workflow,
      /actions\/create-github-app-token@[0-9a-f]{40} # v2/,
    )
    assert.match(workflow, /app-id: \$\{\{ vars\.RELEASE_APP_ID \}\}/)
    assert.match(workflow, /private-key: \$\{\{ secrets\.RELEASE_APP_PRIVATE_KEY \}\}/)
  })

  test('uses the release app token for Changesets operations', () => {
    assert.match(
      workflow,
      /github-token: \$\{\{ steps\.release_app_token\.outputs\.token \}\}/,
    )
    assert.match(
      workflow,
      /GITHUB_TOKEN: \$\{\{ steps\.release_app_token\.outputs\.token \}\}/,
    )
    assert.doesNotMatch(workflow, /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/)
  })

  test('does not leave checkout credentials active', () => {
    assert.match(workflow, /persist-credentials: false/)
  })
})
