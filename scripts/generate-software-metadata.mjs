#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSoftwareMetadata, serializeSoftwareMetadata } from './lib/software-metadata.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputs = {
  citation: join(root, 'CITATION.cff'),
  codemeta: join(root, 'codemeta.json'),
  siteIdentity: join(root, 'apps/docs-next/lib/software-identity.generated.json'),
}
const generated = serializeSoftwareMetadata(buildSoftwareMetadata(root))

if (process.argv.includes('--check')) {
  const stale = Object.entries(outputs)
    .filter(([key, path]) => {
      try { return readFileSync(path, 'utf8') !== generated[key] } catch { return true }
    })
    .map(([, path]) => path)
  if (stale.length > 0) {
    process.stderr.write(`Software metadata is stale: ${stale.map((path) => path.replace(`${root}/`, '')).join(', ')}\n`)
    process.exitCode = 1
  }
} else {
  for (const [key, path] of Object.entries(outputs)) writeFileSync(path, generated[key])
}
