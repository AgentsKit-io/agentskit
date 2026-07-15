#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  evaluateDocumentationQuality,
  evaluateDocumentationQualityMatrix,
  parseDocumentationQualityProfile,
} from './lib/ecosystem-documentation-quality.mjs'

const root = process.cwd()
const profilePath = resolve(root, 'ecosystem-documentation-quality-v1.json')
const profile = parseDocumentationQualityProfile(JSON.parse(readFileSync(profilePath, 'utf8')))
const evidenceIndex = process.argv.indexOf('--evidence')
const evidenceDirectoryIndex = process.argv.indexOf('--evidence-dir')
const profileOnly = process.argv.includes('--profile-only')
const requireCertified = process.argv.includes('--require-certified')
const verifyLocal = process.argv.includes('--verify-local')

if (profileOnly && (evidenceIndex !== -1 || evidenceDirectoryIndex !== -1)) {
  console.error('Use --profile-only, --evidence <path>, or --evidence-dir <path>, not more than one.')
  process.exit(2)
}

if (profileOnly) {
  console.log(JSON.stringify({
    ok: true,
    profile: profile.id,
    version: profile.version,
    status: profile.status,
    products: profile.productIds.length,
  }, null, 2))
  process.exit(0)
}

if (evidenceIndex === -1 && evidenceDirectoryIndex === -1) {
  console.error('Usage: node scripts/check-ecosystem-documentation-quality.mjs --profile-only | --evidence <path> | --evidence-dir <path> [--verify-local --repo-root <product>=<path>] [--require-certified]')
  process.exit(2)
}

function repositoryRoots() {
  const roots = {}
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== '--repo-root') continue
    const raw = process.argv[index + 1] ?? ''
    const separator = raw.indexOf('=')
    if (separator < 1 || separator === raw.length - 1) {
      console.error('--repo-root must use <product>=<path>.')
      process.exit(2)
    }
    roots[raw.slice(0, separator)] = resolve(root, raw.slice(separator + 1))
  }
  return roots
}

if (evidenceDirectoryIndex !== -1) {
  const directoryValue = process.argv[evidenceDirectoryIndex + 1]
  if (!directoryValue) {
    console.error('--evidence-dir requires a path.')
    process.exit(2)
  }
  const directory = resolve(root, directoryValue)
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    console.error(`Evidence directory is not a directory: ${directoryValue}`)
    process.exit(2)
  }
  const evidence = readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(resolve(directory, file), 'utf8')))
  const result = evaluateDocumentationQualityMatrix(profile, evidence, {
    roots: repositoryRoots(),
    requireRoots: verifyLocal,
    attestationRoot: root,
    verifyAttestation: verifyLocal,
  })
  console.log(JSON.stringify(result, null, 2))
  if (!result.eligible || (requireCertified && !result.certified)) process.exit(1)
  process.exit(0)
}

const evidencePath = resolve(root, process.argv[evidenceIndex + 1])
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
const result = evaluateDocumentationQuality(profile, evidence, {
  root,
  attestationRoot: root,
  verifyAttestation: verifyLocal,
})
console.log(JSON.stringify(result, null, 2))

if (!result.eligible || (requireCertified && !result.certified)) process.exit(1)
