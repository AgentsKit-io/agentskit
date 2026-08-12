import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'vitest'
import { REPO_ROOT } from './compute-stats.mjs'
import { buildSoftwareMetadata, serializeSoftwareMetadata } from './lib/software-metadata.mjs'

const metadata = buildSoftwareMetadata(REPO_ROOT)
const serialized = serializeSoftwareMetadata(metadata)

test('generated software identity surfaces stay aligned with the canonical ecosystem manifest', () => {
  assert.equal(readFileSync(join(REPO_ROOT, 'CITATION.cff'), 'utf8'), serialized.citation)
  assert.equal(readFileSync(join(REPO_ROOT, 'codemeta.json'), 'utf8'), serialized.codemeta)
  assert.equal(
    readFileSync(join(REPO_ROOT, 'apps/docs-next/lib/software-identity.generated.json'), 'utf8'),
    serialized.siteIdentity,
  )
})

test('the source and application identities remain linked without conflating them', () => {
  assert.equal(metadata.codemeta['@context'], 'https://w3id.org/codemeta/3.1')
  assert.equal(metadata.codemeta['@type'], 'SoftwareSourceCode')
  assert.equal(metadata.siteIdentity.application.isBasedOn['@id'], metadata.siteIdentity.sourceCode['@id'])
  assert.equal(metadata.siteIdentity.sourceCode.publisher['@id'], metadata.siteIdentity.organization['@id'])
  assert.equal(metadata.siteIdentity.application.offers.price, '0')
})

test('the home page emits the generated identity graph instead of maintaining a second copy', () => {
  const home = readFileSync(join(REPO_ROOT, 'apps/docs-next/app/(home)/page.tsx'), 'utf8')
  assert.match(home, /softwareIdentity\.organization/)
  assert.match(home, /softwareIdentity\.sourceCode/)
  assert.match(home, /softwareIdentity\.application/)
  assert.doesNotMatch(home, /'@type': 'Organization'/)
  assert.doesNotMatch(home, /'@type': 'SoftwareApplication'/)
})

test('citation authorship and public licensing are explicit', () => {
  assert.match(metadata.citation, /family-names: "Braun"/)
  assert.match(metadata.citation, /given-names: "Emerson"/)
  assert.match(metadata.citation, /license: MIT/)
  assert.equal(metadata.codemeta.license, 'https://spdx.org/licenses/MIT')
})
