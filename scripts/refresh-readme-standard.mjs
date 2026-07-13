#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computeReadmeSourceHash, parseReadmeStandard } from './lib/readme-standard.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

const argument = name => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}
const root = resolve(argument('--root') ?? REPO_ROOT)
const configPath = resolve(root, argument('--config') ?? 'readme-standard-v1.json')
const config = parseReadmeStandard(JSON.parse(readFileSync(configPath, 'utf8')))
const reviewedOn = argument('--date') ?? process.env.README_STANDARD_DATE ?? new Date().toISOString().slice(0, 10)

for (const surface of config.surfaces) {
  surface.freshness.reviewedOn = reviewedOn
  const profile = config.profiles.find(item => item.id === surface.profileId)
  const due = new Date(`${reviewedOn}T00:00:00Z`)
  due.setUTCDate(due.getUTCDate() + profile.budgets.freshness.reviewCadenceDays)
  surface.freshness.reviewDueOn = due.toISOString().slice(0, 10)
  surface.freshness.sourceHash = computeReadmeSourceHash(root, surface.freshness.sources)
}

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
console.log(`README Standard v1 freshness refreshed for ${config.surfaces.length} surface(s) on ${reviewedOn}.`)
