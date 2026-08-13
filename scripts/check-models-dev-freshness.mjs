#!/usr/bin/env node
/**
 * Check that the committed models.dev snapshot is recent and optionally agrees
 * with the live normalized source. Offline mode is safe for normal CI; the
 * scheduled workflow opts into --live to detect upstream drift.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchModelsDev } from './lib/models-dev-catalog.mjs'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const snapshotPath = join(root, 'packages', 'adapters', 'src', 'catalog', 'snapshot.json')
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
const ageFlag = process.argv.indexOf('--max-age-days')
const maxAgeDays = ageFlag >= 0 ? Number(process.argv[ageFlag + 1]) : 35
const ageMs = Date.now() - Date.parse(snapshot.generatedAt)
const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000

if (!Number.isFinite(ageMs) || ageMs < 0) {
  console.error(`invalid catalog generatedAt: ${snapshot.generatedAt}`)
  process.exit(1)
}
if (ageMs > maxAgeMs) {
  console.error(`models.dev snapshot is ${Math.floor(ageMs / 86400000)} days old; refresh it with pnpm sync:models`)
  process.exit(1)
}

if (process.argv.includes('--live')) {
  const { snapshot: live } = await fetchModelsDev()
  if (live.source.contentHash !== snapshot.source.contentHash) {
    console.error('models.dev snapshot drifted from the live normalized source; run pnpm sync:models')
    process.exit(1)
  }
}

if (!snapshot.schemaVersion || snapshot.source?.name !== 'models.dev' || !Array.isArray(snapshot.providers)) {
  console.error('models.dev snapshot failed its structural contract')
  process.exit(1)
}
console.log(`models.dev snapshot fresh: ${snapshot.source.version} (${snapshot.providers.length} providers)`)
