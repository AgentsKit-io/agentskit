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

  test('configures npm trusted publishing without token-auth config', () => {
    assert.match(workflow, /registry-url: https:\/\/registry\.npmjs\.org/)
    assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN/)
    assert.match(workflow, /node scripts\/publish-with-npm\.mjs/)
  })

  test('verifies the npm release client tarball before activating it', () => {
    assert.match(workflow, /NPM_TARBALL_URL: https:\/\/registry\.npmjs\.org\/npm\/-\/npm-11\.18\.0\.tgz/)
    assert.match(workflow, /NPM_TARBALL_SHA512: [A-Za-z0-9+/]+=*/)
    assert.match(workflow, /openssl dgst -sha512 -binary npm-11\.18\.0\.tgz/)
    assert.match(workflow, /tar -xzf npm-11\.18\.0\.tgz -C "\$npm_client_dir" --strip-components=1/)
    assert.match(workflow, /exec node "\%s\/bin\/npm-cli\.js" "\$@".*npm_client_dir/)
    assert.match(workflow, /chmod \+x "\$npm_client_dir\/bin\/npm"/)
    assert.match(workflow, /echo "\$npm_client_dir\/bin" >> "\$GITHUB_PATH"/)
    assert.match(workflow, /echo "NPM_CLIENT_DIR=\$npm_client_dir" >> "\$GITHUB_ENV"/)
    assert.match(workflow, /node "\$npm_client_dir\/bin\/npm-cli\.js" --version/)
  })

  test('uses the pinned npm client for SBOM generation', () => {
    assert.match(
      workflow,
      /node "\$NPM_CLIENT_DIR\/bin\/npm-cli\.js" exec --yes --package="@cyclonedx\/cyclonedx-npm@2\.0\.0" -- cyclonedx-npm/,
    )
    assert.doesNotMatch(workflow, /npx --yes @cyclonedx\/cyclonedx-npm/)
  })
})
