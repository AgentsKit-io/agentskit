import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'

const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')

describe('release workflow authentication', () => {
  test('creates a short-lived token from the dedicated release app', () => {
    assert.match(
      workflow,
      /actions\/create-github-app-token@[0-9a-f]{40} # v3\.2\.0/,
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

  test('verifies the npm release client tarball before installing it', () => {
    assert.match(workflow, /NPM_TARBALL_URL: https:\/\/registry\.npmjs\.org\/npm\/-\/npm-11\.18\.0\.tgz/)
    assert.match(workflow, /NPM_TARBALL_SHA512: [A-Za-z0-9+/]+=*/)
    assert.match(workflow, /openssl dgst -sha512 -binary npm-11\.18\.0\.tgz/)
    assert.match(workflow, /npm install --global \.\/npm-11\.18\.0\.tgz/)
  })
})
