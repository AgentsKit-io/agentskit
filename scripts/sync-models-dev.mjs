#!/usr/bin/env node
/**
 * models.dev sync tool — fetch → normalize → emit a committed snapshot.
 *
 * This is build-time only. Runtime consumers load the committed snapshot and
 * never depend on models.dev availability. Use --input for an offline payload
 * and --generated-at for reproducible snapshot commits.
 */
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildSnapshot, fetchModelsDev } from './lib/models-dev-catalog.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'packages', 'adapters', 'src', 'catalog', 'snapshot.json')

function writeSnapshot(snapshot) {
  const temporaryDirectory = mkdtempSync(join(dirname(OUT), '.models-dev-snapshot-'))
  const temporaryPath = join(temporaryDirectory, 'snapshot.json')
  try {
    writeFileSync(temporaryPath, JSON.stringify(snapshot, null, 2) + '\n')
    renameSync(temporaryPath, OUT)
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

function arg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function loadSnapshot() {
  const input = arg('--input')
  if (input) {
    const data = JSON.parse(readFileSync(input, 'utf8'))
    return buildSnapshot(data, {
      generatedAt: arg('--generated-at'),
      version: arg('--version'),
    })
  }
  const result = await fetchModelsDev()
  return buildSnapshot(result.data, {
    generatedAt: arg('--generated-at'),
    version: arg('--version'),
    etag: result.etag,
    contentHash: result.snapshot.source.contentHash,
  })
}

async function main() {
  const snapshot = await loadSnapshot()
  writeSnapshot(snapshot)
  const modelCount = snapshot.providers.reduce((count, provider) => count + provider.models.length, 0)
  const compatibleCount = snapshot.providers.filter((provider) => provider.openaiCompatible).length
  console.log(
    `snapshot written: ${snapshot.providers.length} providers (${compatibleCount} openai-compatible), ${modelCount} models → ${OUT}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
